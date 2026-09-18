from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def sync_database_schema(bind_engine, base_model):
    """
    Ensures all tables and newly added model columns are present in the database.
    Automatically executes ALTER TABLE ADD COLUMN for any missing fields without dropping data.
    """
    base_model.metadata.create_all(bind=bind_engine)
    inspector = inspect(bind_engine)
    existing_tables = set(inspector.get_table_names())
    
    with bind_engine.connect() as conn:
        for table_name, table in base_model.metadata.tables.items():
            if table_name in existing_tables:
                existing_columns = {col["name"] for col in inspector.get_columns(table_name)}
                for col in table.columns:
                    if col.name not in existing_columns:
                        col_type = col.type.compile(bind_engine.dialect)
                        if "INT" in str(col_type).upper() or "FLOAT" in str(col_type).upper() or "BOOL" in str(col_type).upper():
                            default_clause = "DEFAULT 0"
                        else:
                            default_clause = "DEFAULT ''"
                        
                        alter_query = f"ALTER TABLE {table_name} ADD COLUMN {col.name} {col_type} {default_clause}"
                        try:
                            conn.execute(text(alter_query))
                            conn.commit()
                            print(f"[DB Sync] Successfully added missing column: {table_name}.{col.name} ({col_type})")
                        except Exception as e:
                            print(f"[DB Sync] Note on {table_name}.{col.name}: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

