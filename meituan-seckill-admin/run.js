#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('👉 开始执行安装和运行脚本...');

// 创建一个临时的package.json备份
const packageJsonPath = path.join(__dirname, 'package.json');
const backupPath = path.join(__dirname, 'package.json.bak');

try {
    // 备份原始package.json文件
    if (fs.existsSync(packageJsonPath)) {
        fs.copyFileSync(packageJsonPath, backupPath);
        console.log('📝 已备份package.json文件');
    }

    // 安装依赖并启动开发服务器
    console.log('📦 开始安装依赖...');
    const installProcess = spawn('npm', ['install'], { stdio: 'inherit', shell: true });

    installProcess.on('close', (code) => {
        if (code !== 0) {
            console.error('❌ 安装依赖失败');
            // 恢复备份的package.json
            if (fs.existsSync(backupPath)) {
                fs.copyFileSync(backupPath, packageJsonPath);
                console.log('🔄 已恢复原始package.json文件');
            }
            process.exit(1);
        }

        console.log('✅ 依赖安装成功');

        // 启动开发服务器
        console.log('🚀 启动开发服务器...');
        const devProcess = spawn('npm', ['run', 'dev'], { stdio: 'inherit', shell: true });

        devProcess.on('close', (code) => {
            if (code !== 0) {
                console.error('❌ 开发服务器启动失败');
                process.exit(1);
            }
        });

        // 删除备份文件
        try {
            if (fs.existsSync(backupPath)) {
                fs.unlinkSync(backupPath);
            }
        } catch (err) {
            console.warn('⚠️ 删除备份文件时出错:', err);
        }
    });
} catch (error) {
    console.error('❌ 执行脚本过程中出错:', error);

    // 出错时恢复备份
    try {
        if (fs.existsSync(backupPath)) {
            fs.copyFileSync(backupPath, packageJsonPath);
            console.log('🔄 已恢复原始package.json文件');
        }
    } catch (restoreError) {
        console.error('❌ 恢复备份失败:', restoreError);
    }
} 