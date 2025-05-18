{ inputs, ... }:

let
  self = inputs.self;
  nixpkgs = inputs.nixpkgs;
in {

  perSystem = { system, pkgs, lib, ... }: {
    _module.args.pkgs = import nixpkgs {
      inherit system;
    };

    devShells.default = pkgs.mkShell {
      name = "my-python-project";

      packages = with pkgs; [
        (python3.withPackages (p:
          with p; [
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
          # jupyterlab
          # ipywidgets
          loguru
          ]))
        pyright
        ruff
        pre-commit
        hatch

        # Javascript/Typescript Frontend
        nodePackages.pnpm
        nodejs
      ];

      shellHook = ''
        export PS1="$(echo -e '\uf3e2') {\[$(tput sgr0)\]\[\033[38;5;228m\]\w\[$(tput sgr0)\]\[\033[38;5;15m\]} (PersonaX) \\$ \[$(tput sgr0)\]"  
        export PYTHONPATH="$(pwd):$PYTHONPATH"
        export AUX_CLOUD_TRACE_PATH="$(pwd)/cloud_trace/config/aux_cloud_trace.json"
      '';
    };
  };
}