{ lib, pnpm_10, stdenv, makeWrapper, nodejs_22 }:

let
  nodejs = nodejs_22;
  pnpm = pnpm_10.override { inherit nodejs; };
in stdenv.mkDerivation (finalAttrs: {
  pname = "meituan-seckill-admin";
  version = "0.1.0";

  src = ../../meituan-seckill-admin;

  nativeBuildInputs = [ nodejs makeWrapper pnpm.configHook ];

  # TODO(前端增加了新的包这里的hash需要重新计算)更新 pnpm 依赖获取配置
  pnpmDeps = pnpm.fetchDeps {
    inherit (finalAttrs) pname version src;
    hash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  };

  buildPhase = ''
    runHook preBuild

    pnpm install --offline
    pnpm build
    pnpm prune --prod --ignore-scripts

    # 清理缓存和无效软链接
    rm -rf dist/.vite
    find node_modules -xtype l -delete

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    mkdir -p $out
    cp -r dist/* $out
    runHook postInstall
  '';

  meta = {
    description = "Meituan Seckill Admin";
    license = lib.licenses.mit;
    platforms = lib.platforms.linux;
  };
})