{ lib, pnpm_10, stdenv, makeWrapper, nodejs_22 }:

let
  nodejs = nodejs_22;
  pnpm = pnpm_10.override { inherit nodejs; };
in stdenv.mkDerivation (finalAttrs: {
  pname = "meituan-seckill-admin";
  version = "0.1.0";

  src = ../../meituan-seckill-admin;
  # 完全禁用源代码过滤
  dontFilter = true;

  nativeBuildInputs = [ nodejs makeWrapper pnpm.configHook ];

  # TODO(前端增加了新的包这里的hash需要重新计算)更新 pnpm 依赖获取配置
  pnpmDeps = pnpm.fetchDeps {
    inherit (finalAttrs) pname version src;
    hash = "sha256-E1yUGdGaG8byPMBiuc4JetvIY1bkY7JYOABNyDFOdC8=";
  };

  # 特别处理LogList.tsx文件
  postUnpack = ''
    # 确保logs目录存在
    mkdir -p $sourceRoot/src/pages/logs
    
    # 检查LogList.tsx是否存在，若不存在则从本地文件系统复制
    if [ ! -f "$sourceRoot/src/pages/logs/LogList.tsx" ]; then
      echo "LogList.tsx不存在，尝试复制..."
      cp -f /home/ubuntu/workspaces/meituan-seckill/meituan-seckill-admin/src/pages/logs/LogList.tsx $sourceRoot/src/pages/logs/ || echo "复制失败"
    fi

    echo "查看源码目录内容"
    ls -la $sourceRoot/src/pages/logs
  '';

  buildPhase = ''
    runHook preBuild

    # 添加调试信息
    echo "当前目录内容："
    ls -la
    echo "src目录内容："
    ls -la src
    echo "src/pages目录内容："
    ls -la src/pages
    echo "src/pages/logs目录内容："
    ls -la src/pages/logs || echo "logs目录不存在"

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