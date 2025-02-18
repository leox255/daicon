#!/usr/bin/env node

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { glob } from 'glob';
import fs from 'fs-extra';
import path from 'path';
import { pascalCase, snakeCase } from "change-case-all";
import figlet from 'figlet';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import svgtofont from 'svgtofont';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log(
  chalk.cyan(
    figlet.textSync('Daicon', { horizontalLayout: 'full' })
  )
);
console.log(chalk.yellow('Welcome to Daicon - SVG to Flutter Icons Converter\n'));

async function generateIconFont(svgFiles, inputDir, outputPath, fontName) {
  const tempDir = path.join(outputPath, '.temp_icons');
  await fs.ensureDir(tempDir);
  
  // Intercept console output
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  console.log = () => {};
  console.error = (...args) => {
    if (!args[0].includes('SvgToFont:CLI:ERR') && !args[0].includes('SUCCESS')) {
      originalConsoleError.apply(console, args);
    }
  };
  
  try {
    // Copy SVG files to temp directory with minimal processing
    for (let i = 0; i < svgFiles.length; i++) {
      const file = svgFiles[i];
      let svgContent = await fs.readFile(path.join(inputDir, file), 'utf-8');
      
      try {
        // Ensure SVG has viewBox and fill
        if (!svgContent.includes('viewBox')) {
          svgContent = svgContent.replace('<svg', '<svg viewBox="0 0 24 24"');
        }
        
        // Add fill="currentColor" to the SVG if it doesn't have any fill
        if (!svgContent.includes('fill="') && !svgContent.includes('fill:')) {
          svgContent = svgContent.replace('<svg', '<svg fill="currentColor"');
        }

        const newName = `icon_${i}.svg`;
        await fs.writeFile(path.join(tempDir, newName), svgContent);
        
      } catch (error) {
        const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2z"/></svg>`;
        const newName = `icon_${i}.svg`;
        await fs.writeFile(path.join(tempDir, newName), fallbackSvg);
      }
    }

    // Create fonts directory
    const fontsDir = path.join(outputPath, 'fonts');
    await fs.ensureDir(fontsDir);

    // Generate font with minimal options
    await svgtofont({
      src: tempDir,
      dist: tempDir,
      fontName: fontName,
      css: false,
      startUnicode: 0xe900,
      svgicons2svgfont: {
        fontHeight: 1000,
        normalize: true
      },
      // Disable unnecessary font formats
      formats: ['ttf'],
      // Disable symbol generation which causes the error
      symbol: false,
      // Disable website generation
      website: false,
      // Don't clear output directory
      emptyDist: false,
      // Don't generate SVG font
      outSVGPath: false,
      // Don't use name as unicode
      useNameAsUnicode: false
    });

    // Move TTF file
    await fs.move(
      path.join(tempDir, `${fontName}.ttf`),
      path.join(outputPath, 'fonts', `${fontName}.ttf`),
      { overwrite: true }
    );

    // Clean up
    await fs.remove(tempDir);

  } catch (error) {
    throw error;
  } finally {
    // Restore console output
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  }
}

function generateDartClass(iconNames, className) {
  const header = `// Place fonts/${className}.ttf in your fonts/ directory and
// add the following to your pubspec.yaml
// flutter:
//   fonts:
//    - family: ${className}
//      fonts:
//       - asset: fonts/${className}.ttf
//
// Generated with Daicon

`;

  const imports = `import 'package:flutter/widgets.dart';`;

  const classDefinition = `
class ${className} {
  ${className}._();

  static const String _fontFamily = '${className}';

${iconNames.map((name, index) => `  static const IconData ${snakeCase(name)} = IconData(0x${(0xe900 + index).toString(16)}, fontFamily: _fontFamily);`).join('\n')}
}`;

  return `${header}${imports}\n${classDefinition}`;
}

function generateReadMe(className) {
  return `# ${className} Icons

This folder contains Flutter-compatible icon font files generated with Daicon.

## Files
- \`fonts/${className}.ttf\`: The icon font file
- \`${className}_icons.dart\`: Dart class with icon definitions

## Using with Flutter

1. Copy this folder to your Flutter project
2. Add the font to your \`pubspec.yaml\`:
\`\`\`yaml
flutter:
  fonts:
    - family: ${className}
      fonts:
        - asset: fonts/${className}.ttf
\`\`\`
3. Import the icons in your code:
\`\`\`dart
import 'package:your_package/${className}_icons.dart';
\`\`\`
4. Use the icons in your widgets:
\`\`\`dart
Icon(${className}.icon_name)
\`\`\`

## Using with FlutterFlow

1. Open your FlutterFlow project
2. Navigate to Theme Settings (from navigation menu) > Typography & Icons
3. Scroll down to the Custom Icons section
4. Click on the + Add Icons button
5. Click on the Upload Icon File button
6. Select and upload the \`${className}.ttf\` file from the \`fonts\` directory
7. Click on the Upload Icon Info button
8. Select and upload the \`${className}_icons.dart\` file
9. Click Add Icons
10. To use a custom icon:
    - Add the Icon widget to your design
    - In the properties panel, scroll to the Icon section
    - Click on the selected icon
    - Select the Custom Icons tab
    - Choose your icon from the list

## Generated with Daicon
https://github.com/leox255/daicon`;
}

async function main() {
  try {
    // Get input directory
    const { inputDir } = await inquirer.prompt([
      {
        type: 'input',
        name: 'inputDir',
        message: 'Enter the path to your SVG icons folder:',
        validate: (input) => {
          if (!input) return 'Please enter a valid path';
          if (!fs.existsSync(input)) return 'Directory does not exist';
          return true;
        }
      }
    ]);

    const absoluteInputPath = path.resolve(inputDir);
    const parentDir = path.dirname(absoluteInputPath);
    const defaultName = path.basename(absoluteInputPath);
    const className = pascalCase(defaultName);
    const outputDir = `${defaultName}-flutter`;
    const outputPath = path.join(parentDir, outputDir);
    
    if (fs.existsSync(outputPath)) {
      await fs.remove(outputPath);
    }
    
    await fs.ensureDir(outputPath);

    const spinner = ora('Processing SVG files...').start();

    // Find SVG files
    const svgFiles = await glob('**/*.svg', { cwd: absoluteInputPath });

    if (svgFiles.length === 0) {
      spinner.fail('No SVG files found in the specified directory');
      process.exit(1);
    }

    // Process SVG files
    const iconNames = svgFiles.map(file => path.basename(file, '.svg'));

    // Generate font files
    spinner.text = 'Generating icon font...';
    try {
      await generateIconFont(svgFiles, absoluteInputPath, outputPath, className);
    } catch (error) {
      // Only show error if it's not the symbol generation error
      if (!error.message.includes('Unmatched selector')) {
        spinner.fail(chalk.red(error.message));
        process.exit(1);
      }
    }

    // Generate Dart class
    spinner.text = 'Generating Dart class...';
    const dartContent = generateDartClass(iconNames, className);
    await fs.writeFile(path.join(outputPath, `${className}_icons.dart`), dartContent);

    // Generate README
    spinner.text = 'Generating documentation...';
    const readmeContent = generateReadMe(className);
    await fs.writeFile(path.join(outputPath, 'README.md'), readmeContent);

    // Clear any previous text to avoid showing intermediate states
    spinner.text = '';
    spinner.succeed(chalk.green('Successfully generated Flutter icons!'));
    console.log(chalk.cyan('\nOutput directory:'), chalk.yellow(outputPath));
    console.log(chalk.cyan('Number of icons processed:'), chalk.yellow(svgFiles.length));
    console.log(chalk.green('\nGenerated files:'));
    console.log(chalk.white(`- ${className}_icons.dart (Dart class with icon definitions)`));
    console.log(chalk.white(`- fonts/${className}.ttf (Icon font file)`));
    console.log(chalk.white(`- README.md (Usage instructions)`));
    console.log(chalk.green('\nNext steps:'));
    console.log(chalk.white('1. Copy the generated folder to your Flutter project'));
    console.log(chalk.white('2. Add the font to your pubspec.yaml as shown in the README'));
    console.log(chalk.white(`3. Import the ${className}_icons.dart file in your code`));
    console.log(chalk.white(`4. Use the icons with ${className}.iconName\n`));

  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(chalk.red('Error:'), error.message);
  process.exit(1);
}); 