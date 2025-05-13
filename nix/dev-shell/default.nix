{ mkShell, python3, nodejs_20, pnpm_10 }:

let
  pythonEnv = python3.withPackages (pyPkgs:
    with pyPkgs; [
      # For both Dev and Deploy
      click
      # redis
      # numpy
      # pandas
      # pyarrow
      # matplotlib
      # tqdm
      # pytz
      # pydantic

      # Dev only packages
      yapf
      pylint
      black
      # jupyterlab
      # ipywidgets
      loguru
      # python-lsp-server # From Microsoft, not Palantir
      # TODO(breakds): Jupyter here has conflict when numpandas is
      # introduced. Investigate why when we need Jupyter.
    ]);

  pythonIcon = "f3e2";

in mkShell rec {
  name = "python-dev-shll";

  packages = [ pythonEnv nodejs_20 pnpm_10 ];

  # This is to have a leading python icon to remind the user we are in
  # the Trading Agent python dev environment.
  shellHook = ''
    export PS1="$(echo -e '\u${pythonIcon}') {\[$(tput sgr0)\]\[\033[38;5;228m\]\w\[$(tput sgr0)\]\[\033[38;5;15m\]} (${name}) \\$ \[$(tput sgr0)\]"
    export PYTHONPATH="$(pwd):${pythonEnv}/${pythonEnv.sitePackages}:$PYTHONPATH"
  '';
}
