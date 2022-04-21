import math
import pandas as pd
from ptype.Ptype import Ptype
from ptype.PtypeCat import PtypeCat

# import numpy as np

pd.options.display.max_colwidth = 20


# See: https://github.com/extremeheat/JSPyBridge/blob/master/docs/javascript.md
class PTypeRunner:
    def __init__(self, degrees, integers=False):
        self.degrees = degrees
        self.integers = integers

    def add(self, a, b):
        return a + b

    def div(self, a, b):
        if self.integers:
            return round(a / b)
        else:
            return a / b

    def tan(self, val):
        if self.degrees:
            # We need to round here because floating points are imprecise
            return round(math.tan(math.radians(val)))
        return math.tan(val)


def read_csv_df(csvfile: str, columns: list[str], method: str):
    if method == "pandas":
        return pd.read_csv(csvfile, usecols=columns)[columns]
    if method == "ptype":
        return pd.read_csv(
            csvfile,
            usecols=columns,
            dtype="str",
            keep_default_na=False,
        )[columns]
    if method == "ptype_Cat":
        return pd.read_csv(
            csvfile,
            usecols=columns,
            dtype="str",
            keep_default_na=False,
        )[columns]


def run_type_inference(
    csv_filename: str, columns: list[str], method: str = "ptype_cat"
):
    df = read_csv_df(csv_filename, columns)

    if method == "ptype":
        ptype = Ptype()
        schema = ptype.schema_fit(df)
    if method == "ptype_Cat":
        ptype_cat = PtypeCat()
        schema = ptype_cat.schema_fit(df)

    schema.show()
