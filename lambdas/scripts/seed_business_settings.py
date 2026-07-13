#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os

import boto3
from botocore.exceptions import ClientError
from seed_data import BUSINESS_SETTINGS


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--idempotent", action="store_true")
    args = parser.parse_args()

    table = boto3.resource("dynamodb").Table(os.environ["TABLE_BUSINESS_SETTINGS"])
    kwargs = {"Item": BUSINESS_SETTINGS}
    if args.idempotent:
        kwargs["ConditionExpression"] = "attribute_not_exists(settingId)"

    try:
        table.put_item(**kwargs)
    except ClientError as exc:
        if args.idempotent and exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return
        raise


if __name__ == "__main__":
    main()
