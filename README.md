# Simple Guide to start python development

1. 创建一个文件夹用于存放代码文件，例如 `cloude-trace`，并进入相应文件夹

```bash
cd ~
mkdir work/cloude-trace -p
cd work/cloude-trace
```

2. 使用 `nix flake template` 初始化项目

```bash
nix flake init -t "git+ssh://git@github.com/quant-wonderland/wonder-pkgs#python-dev-starter" --refresh  
nix flake lock --override-input nixpkgs "github:NixOS/nixpkgs?rev=841889913dfd06a70ffb39f603e29e46f45f0c1a"
```

3. 查看初始化后的文件结构，查看 `README.md` 文件，按照 `README.md` 文件的指引进行开发


# Python development Starter Kit User Guide 如何使用本 template 快速创建一个python repo

## 1. 目录结构

以下仅展示现在有目录结构, 这只是一个基础的模板目的仅为了方便快速构建一个python repo。

```bash
├── flake.lock # 依赖包的版本锁定文件，无需更改
├── flake.nix # 依赖包的版本以及依赖关系文件，如无必要无需更改
├── nix
│   └── pkgs
│       ├── dev-shell
│              └── default.nix # 依赖包的版本以及依赖关系文件，如无必要无需更改
│     
├── README.md
├── your_project_folder
│   ├── __init__.py # init 文件，增加新的函数时需要增加 import
│   ├── other_template_file1.py # 示例python文件
│   ├── other_template_file2.py # 示例python文件
│   ├── other_template_file3.py # 示例python文件
│   ├── other_template_file4.py # 示例python文件
│   ├── other_template_file5.py # 示例python文件
│   └── main.py # 示例python文件, 此文件一般为项目启动文件
└── setup.py # 打包为 pkgs 的话需要, 需要根据你自己的命令行启动方式构建打包文件
```




## 2. 运行

首先执行如下命令进入开发环境：

```bash
nix develop
```

使用命令行方式运行你的项目：

```bash
python -m path.to.main:main
```

