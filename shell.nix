{ pkgs ? import <nixpkgs> {} }:
pkgs.mkShell {
  nativeBuildInputs = with pkgs; [
    nodejs_22
    corepack
  ];

  shellHook = ''
    export PATH="$PWD/node_modules/.bin/:$PATH"
  '';
}
