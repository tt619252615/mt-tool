{
  description = "My awesome python project";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11";

    flake-parts.url = "github:hercules-ci/flake-parts";
    flake-parts.inputs.nixpkgs-lib.follows = "nixpkgs";
  };

  outputs = { self, flake-parts, nixpkgs, ... }@inputs:

    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = [ "aarch64-linux" "aarch64-darwin" "x86_64-linux" ];

      imports = [ ./nix/dev-shell/default.nix ./nix/exported.nix ];

      perSystem = { system, config, pkgs-dev, ... }: {
        formatter = pkgs-dev.nixfmt-classic;
      };
    };

}