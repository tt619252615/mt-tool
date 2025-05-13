from setuptools import setup, find_packages
import unittest




setup(
    name="you package name",
    version="0.0.1",
    author="author name",
    author_email="author email",
    packages=find_packages(),
    entry_points={
        "console_scripts": [
            "package_name=path.to.main:main",
        ]
    },
    python_requires=">=3.6",
)
