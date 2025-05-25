{ buildPythonPackage, makeWrapper, pytestCheckHook, loguru, click, numpy, pandas,requests,pymysql
, fastapi, uvicorn, pydantic, sqlalchemy, python-jose, mysqlclient, passlib, python-multipart, pydantic-settings, yapf, pylint, black, meituan-seckill-admin }:

buildPythonPackage {
  pname = "meituan-seckill-api";
  version = "0.1.0";

  src = ../../.;
  
  format = "setuptools";

  nativeBuildInputs = [
    makeWrapper
  ];

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
    # Remove duplicate app directory
    rm -rf $out/lib/python3.12/site-packages/app
    
    # Set up environment
    wrapProgram $out/bin/meituan-seckill-api \
      --set MEITUAN_SECKILL_API_FRONTEND ${meituan-seckill-admin} \
      --set PYTHONPATH "$out/lib/python3.12/site-packages:$PYTHONPATH" \
      --set MEITUAN_SECKILL_CONFIG "$out/lib/python3.12/site-packages/meituan_seckill_api/config.json"
  '';
}