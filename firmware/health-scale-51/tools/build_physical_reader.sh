#!/bin/sh
set -eu

if [ "$(uname -s)" != Darwin ]; then
  printf '%s\n' 'PhysicalScaleReader requires macOS and Xcode Command Line Tools.' >&2
  exit 1
fi

scale_tools_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
scale_app_dir="${1:-$scale_tools_dir/../build/PhysicalScaleReader.app}"
mkdir -p "$scale_app_dir/Contents/MacOS"
cp "$scale_tools_dir/PhysicalScaleReader-Info.plist" "$scale_app_dir/Contents/Info.plist"
xcrun clang -fobjc-arc -Wno-incompatible-pointer-types \
  -framework Cocoa -framework IOBluetooth -framework IOBluetoothUI \
  -framework CoreBluetooth "$scale_tools_dir/physical_reader.m" \
  -o "$scale_app_dir/Contents/MacOS/PhysicalScaleReader"
codesign --force --sign - "$scale_app_dir"
printf 'Built %s\n' "$scale_app_dir"
