"""Copy one user — and all their folders → notes → sections — from the local SQLite
database into another database (the production Postgres), preserving the bcrypt password
hash so the *same login* keeps working on the destination.

This is deliberately decoupled from the ORM models: it reflects the tables and inserts an
explicit column list that exists in the initial schema, so it keeps working regardless of
later model/migration changes. Primary keys are re-assigned by the destination and foreign
keys are remapped as we go, so it's safe even if the destination already has other users.

Safety:
  • A conflict guard aborts (writing nothing) if the destination already has a user with the
    same nickname or email — so re-running can't create duplicates.
  • --dry-run does the whole thing in a transaction and rolls back, so you can preview counts.

Usage (run from the backend/ directory, with the venv active):

    # 1) preview — writes nothing
    TARGET_DATABASE_URL="postgresql://USER:PASS@HOST:5432/DB?sslmode=require" \
        python scripts/transfer_user.py --dry-run

    # 2) for real
    TARGET_DATABASE_URL="postgresql://USER:PASS@HOST:5432/DB?sslmode=require" \
        python scripts/transfer_user.py

Use Render's **External** database URL (append ?sslmode=require). --nickname defaults to
hixie_owner; --source defaults to the local SQLite file.
"""
import argparse
import os
import sys

from sqlalchemy import create_engine, MetaData, Table, select, insert

DEFAULT_SOURCE = "sqlite:///./note_tracker.db"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--source", default=os.getenv("SOURCE_DATABASE_URL", DEFAULT_SOURCE))
    ap.add_argument("--target", default=os.getenv("TARGET_DATABASE_URL"))
    ap.add_argument("--nickname", default="hixie_owner")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not args.target:
        sys.exit("Set --target or TARGET_DATABASE_URL to the destination database URL.")

    src = create_engine(args.source)
    tgt = create_engine(args.target)
    sm, tm = MetaData(), MetaData()
    s = {t: Table(t, sm, autoload_with=src) for t in ("users", "folders", "notes", "sections")}
    t = {t: Table(t, tm, autoload_with=tgt) for t in ("users", "folders", "notes", "sections")}

    # Read the whole subtree from the source up front.
    with src.connect() as sc:
        user = sc.execute(
            select(s["users"]).where(s["users"].c.nickname == args.nickname)
        ).mappings().first()
        if not user:
            sys.exit(f"No user '{args.nickname}' found in source {args.source}")

        folders = sc.execute(
            select(s["folders"]).where(s["folders"].c.user_id == user["id"]).order_by(s["folders"].c.id)
        ).mappings().all()
        notes_by_folder, sections_by_note = {}, {}
        for f in folders:
            notes = sc.execute(
                select(s["notes"]).where(s["notes"].c.folder_id == f["id"]).order_by(s["notes"].c.id)
            ).mappings().all()
            notes_by_folder[f["id"]] = notes
            for n in notes:
                sections_by_note[n["id"]] = sc.execute(
                    select(s["sections"]).where(s["sections"].c.note_id == n["id"]).order_by(s["sections"].c.id)
                ).mappings().all()

    n_notes = sum(len(v) for v in notes_by_folder.values())
    n_secs = sum(len(v) for v in sections_by_note.values())
    print(
        f"Source: '{user['nickname']}' <{user['email']}> — "
        f"{len(folders)} folders, {n_notes} notes, {n_secs} sections"
    )

    conn = tgt.connect()
    trans = conn.begin()
    try:
        clash = conn.execute(
            select(t["users"]).where(
                (t["users"].c.nickname == user["nickname"]) | (t["users"].c.email == user["email"])
            )
        ).mappings().first()
        if clash:
            sys.exit(
                f"ABORT: destination already has a user matching nickname/email "
                f"(id={clash['id']}, nickname={clash['nickname']!r}). Nothing written."
            )

        new_user_id = conn.execute(
            insert(t["users"]).values(
                nickname=user["nickname"],
                email=user["email"],
                hashed_password=user["hashed_password"],
                created_at=user["created_at"],
            )
        ).inserted_primary_key[0]

        for f in folders:
            new_folder_id = conn.execute(
                insert(t["folders"]).values(
                    name=f["name"],
                    purpose=f["purpose"],
                    color=f["color"],
                    user_id=new_user_id,
                    deleted_at=f["deleted_at"],
                )
            ).inserted_primary_key[0]
            for n in notes_by_folder[f["id"]]:
                new_note_id = conn.execute(
                    insert(t["notes"]).values(
                        title=n["title"],
                        purpose=n["purpose"],
                        folder_id=new_folder_id,
                        deleted_at=n["deleted_at"],
                    )
                ).inserted_primary_key[0]
                for sec in sections_by_note[n["id"]]:
                    conn.execute(
                        insert(t["sections"]).values(
                            note_id=new_note_id,
                            type=sec["type"],
                            content=sec["content"],
                            title=sec["title"],
                        )
                    )

        if args.dry_run:
            trans.rollback()
            print("DRY RUN ok — transaction rolled back, nothing written.")
        else:
            trans.commit()
            print(
                f"DONE — created destination user id {new_user_id} with "
                f"{len(folders)} folders, {n_notes} notes, {n_secs} sections. "
                f"Log in with the same nickname/password."
            )
    except Exception:
        trans.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
