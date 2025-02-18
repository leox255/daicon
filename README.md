# Daicon 🎨 

A CLI tool to convert SVG icons into Flutter-compatible icon fonts with Dart class definitions.

## Features

- 🎯 Converts SVG icons to TTF font format
- ✨ Generates typed Dart class for your icons
- 🔧 Handles SVG optimization automatically
- 🎨 Supports icon colorization through `color` property
- 📦 Creates ready-to-use Flutter font package

## Installation

### Local Installation

1. Clone the repository:
```bash
git clone https://github.com/leox255/daicon.git
cd daicon
```

2. Install dependencies:
```bash
npm install
```

3. Link the package locally:
```bash
npm link
```

Now you can use `daicon` command from anywhere in your terminal.

### Usage

1. Prepare your SVG icons in a directory
2. Run the command:
```bash
daicon
```
3. Enter the path to your SVG icons folder when prompted
4. The tool will generate a new directory with "-flutter" suffix containing:
   - A `.ttf` font file in the `fonts` directory
   - A Dart class file with icon definitions

### Using with Flutter

1. Copy the generated folder to your Flutter project
2. Add the font to your `pubspec.yaml`:
```yaml
flutter:
  fonts:
    - family: YourIconsName
      fonts:
        - asset: fonts/YourIconsName.ttf
```
3. Import the icons in your code:
```dart
import 'package:your_package/your_icons_name_icons.dart';
```
4. Use the icons in your widgets:
```dart
Icon(YourIconsName.icon_name)
```

### Using with FlutterFlow

1. Open your FlutterFlow project
2. Navigate to Theme Settings (from navigation menu) > Typography & Icons
3. Scroll down to the Custom Icons section
4. Click on the + Add Icons button
5. Click on the Upload Icon File button
6. Select and upload the `.ttf` file from the generated `fonts` directory
7. Click on the Upload Icon Info button
8. Select and upload the generated Dart file (e.g., `YourIconsName_icons.dart`)
9. Click Add Icons
10. To use a custom icon:
    - Add the Icon widget to your design
    - In the properties panel, scroll to the Icon section
    - Click on the selected icon
    - Select the Custom Icons tab
    - Choose your icon from the list

## Requirements

- Node.js 14.0 or higher
- npm or yarn
- Flutter SDK (for using the generated package)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT 