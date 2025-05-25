from setuptools import setup, find_namespace_packages
import unittest




setup(
    name="meituan-seckill-api",
    version="0.0.1",
    author="tt619252615",
    author_email="cz619252615@gmail.com",
    packages=find_namespace_packages(include=['meituan_seckill_api*', 'app*']),
    package_data={
        'meituan_seckill_api': [
            'config.json',
            'config.example.json',
            '*.py',
            'app/**/*',
            'alembic/**/*'
        ],
    },
    include_package_data=True,
    entry_points={
        "console_scripts": [
            "meituan-seckill-api=meituan_seckill_api.startup:start",
        ]
    },
    python_requires=">=3.12",
)
