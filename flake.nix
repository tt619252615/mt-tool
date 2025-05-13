{
  description = ''
    A collection of data pipeline modules implemented in python.
  '';

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11";

    utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, ... }@inputs:
    {
      overlays.dev = nixpkgs.lib.composeManyExtensions [ ];

    } // inputs.utils.lib.eachSystem ["aarch64-linux" ] (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config = { allowUnfree = true; };
          overlays = [ self.overlays.dev ];
        };

      in {
        devShells.default = pkgs.callPackage ./nix/dev-shell { };
        devShells.aarch64-linux = pkgs.callPackage ./nix/dev-shell { };
      });
}
