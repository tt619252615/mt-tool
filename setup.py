from setuptools import setup, find_packages
import unittest




setup(
    name="meituan-seckill",
    version="0.0.1",
    author="tt619252615",
    author_email="cz619252615@gmail.com",
    packages=find_packages(),
    entry_points={
        "console_scripts": [
            "meituan-seckill=meituan_seckill_api.startup:start",
        ]
    },
    python_requires=">=3.12",
)
