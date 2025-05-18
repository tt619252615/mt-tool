{ buildPythonPackage, makeWrapper, pytestCheckHook, loguru, click, numpy, pandas
, fastapi, uvicorn, pydantic, sqlalchemy, python-jose, mysqlclient, passlib, python-multipart, pydantic-settings, yapf, pylint, black }:

buildPythonPackage {
  pname = "meituan-seckill-api";
  version = "0.1.0";

  srcs = ../../.;

  propagatedBuildInputs = [
    numpy
    fastapi
    uvicorn
    loguru
    fastapi
    pydantic
    uvicorn
    sqlalchemy
    python-jose
    mysqlclient
    passlib
    python-multipart
    loguru
    requests
    pydantic-settings
    pymysql

    # Dev only packages
    yapf
    pylint
    black
  ];

  doCheck = true;

  postInstall = ''
    wrapProgram $out/bin/meituan-seckill-api \
      --set MEITUAN_SECKILL_API_FRONTEND ${meituan-seckill-api-webapp}
  '';
}