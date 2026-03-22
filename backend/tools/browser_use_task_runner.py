import argparse
import asyncio
import json
import os
import traceback

from browser_use import Agent
from browser_use.browser.browser import Browser, BrowserConfig
from langchain_openai import ChatOpenAI


def to_bool(value: str) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


async def run_task(task: str, start_url: str, max_steps: int, headless: bool):
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini").strip() or "gpt-4.1-mini"
    if not api_key:
        return {
            "success": False,
            "feedback": "OPENAI_API_KEY is missing. Configure backend/.env first.",
            "error": "missing_openai_api_key",
        }

    final_task = task.strip()
    if start_url:
        final_task = (
            f"Start from this page URL first: {start_url}\n"
            f"Then complete this user request: {final_task}"
        )

    llm = ChatOpenAI(model=model, api_key=api_key)
    browser = Browser(config=BrowserConfig(headless=headless))
    agent = Agent(
        task=final_task,
        llm=llm,
        browser=browser,
        use_vision=True,
    )

    history = await agent.run(max_steps=max_steps)
    try:
        final_result = history.final_result()
    except Exception:
        final_result = ""

    feedback = (
        final_result.strip()
        if isinstance(final_result, str) and final_result.strip()
        else "Agent task completed."
    )
    return {"success": True, "feedback": feedback}


def emit_result(payload):
    print(f"__BROWSER_USE_RESULT__{json.dumps(payload)}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--task", type=str, required=True)
    parser.add_argument("--start-url", type=str, default="")
    parser.add_argument("--max-steps", type=int, default=25)
    parser.add_argument("--headless", type=str, default="false")
    args = parser.parse_args()

    try:
        result = asyncio.run(
            run_task(
                task=args.task,
                start_url=args.start_url,
                max_steps=max(1, args.max_steps),
                headless=to_bool(args.headless),
            )
        )
        emit_result(result)
    except Exception as exc:
        emit_result(
            {
                "success": False,
                "feedback": "Agent execution failed.",
                "error": str(exc),
                "trace": traceback.format_exc(),
            }
        )


if __name__ == "__main__":
    main()
