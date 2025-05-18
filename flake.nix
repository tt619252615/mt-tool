{
  description = "My awesome python project";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11";
    flake-parts.url = "github:hercules-ci/flake-parts";
    flake-parts.inputs.nixpkgs-lib.follows = "nixpkgs";
  };

  outputs = { self, flake-parts, nixpkgs, ... }@inputs:
    let
      # 为了向后兼容，同时导出常规的 flake-parts 结果和旧式的 devShell
      flakeOutputs = flake-parts.lib.mkFlake { inherit inputs; } {
        systems = [ "aarch64-linux" "aarch64-darwin" "x86_64-linux" ];
        imports = [ ./nix/dev-shell/default.nix ./nix/exported.nix ];
      };

      # 系统列表
      systems = [ "aarch64-linux" "aarch64-darwin" "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    flakeOutputs // {
      # 向后兼容的 devShell 属性
      devShell = forAllSystems (system:
        flakeOutputs.devShells.${system}.default
      );
    };
}