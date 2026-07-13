from __future__ import annotations

from aws_lambda_powertools.utilities.typing import LambdaContext

from admin.handler import lambda_handler as admin_handler


def lambda_handler(event: dict, context: LambdaContext) -> dict:
    return admin_handler(event, context)
