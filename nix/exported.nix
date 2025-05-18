{ inputs, ... }:

let self = inputs.self;

in {
  perSystem = { system, pkgs, ... }: {
    _module.args.pkgs = import inputs.nixpkgs {
      inherit system;
      overlays = [
        (final: prev: {
          meituan-seckill-admin =
            final.callPackage ./meituan-seckill-admin { };
          pythonPackagesExtensions = prev.pythonPackagesExtensions ++ [
            (python-final: python-prev: {
              meituan-seckill-api = python-final.callPackage ./meituan-seckill-api {
                inherit (final) meituan-seckill-admin;
              };
            })
          ];
        })
      ];
    };

    packages = {
      inherit (pkgs) meituan-seckill-admin;
      inherit (pkgs.python3Packages) meituan-seckill-api;
      default = pkgs.python3Packages.meituan-seckill-api;
    };
    checks.run-unit-tests = pkgs.python3Packages.meituan-seckill-api;
  };
}