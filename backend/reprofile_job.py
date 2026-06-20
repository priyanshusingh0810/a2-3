import asyncio
import sys
import os

# Adjust path to import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.agents.orchestrator import AgentOrchestrator

async def main():
    db = SessionLocal()
    dataset_id = "a4e2ca79-1619-4813-a22c-ac0f2449b981"
    job_id = 2
    print(f"Reprofiling dataset {dataset_id} for job {job_id}...")
    try:
        await AgentOrchestrator.run_full_profiling(db, dataset_id, job_id)
        print("Reprofiling completed!")
    except Exception as e:
        print("Error during profiling:", e)
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
