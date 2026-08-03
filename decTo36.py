#!/usr/bin/env python3
import sys

def decimal_to_base36(n: int) -> str:
    if n == 0:
        return "0"

    digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    result = []

    negative = n < 0
    n = abs(n)

    while n > 0:
        n, remainder = divmod(n, 36)
        result.append(digits[remainder])

    if negative:
        result.append("-")

    return "".join(reversed(result))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <decimal_number>")
        sys.exit(1)

    try:
        number = int(sys.argv[1])
    except ValueError:
        print("Error: input must be an integer")
        sys.exit(1)

    print(decimal_to_base36(number))
