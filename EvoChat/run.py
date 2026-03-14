#!/usr/bin/env python3
"""CLI runner for EvoChat"""
import sys
from evochat import run

if __name__ == "__main__":
    user_msg = None
    if len(sys.argv) > 1:
        user_msg = " ".join(sys.argv[1:])
    run(user_msg)
