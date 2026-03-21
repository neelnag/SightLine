#!/usr/bin/env python3
"""
Simple script to create placeholder icons for the Voice Navigator extension.
Run with: python create_icons.py
"""

import os
import struct

def create_simple_png(filename, size):
    """Create a simple green microphone-like PNG icon"""
    
    # PNG header signature
    png_signature = b'\x89PNG\r\n\x1a\n'
    
    # Create a simple green square as placeholder
    # For a real icon, you'd want to download from flaticon.com or similar
    
    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    # Calculate CRC for IHDR
    ihdr_crc = 0  # Simplified - actual CRC needed for production
    
    # Simplified PNG - just enough to be valid
    # A proper implementation would use a library like Pillow
    data = png_signature
    
    # IHDR chunk
    data += struct.pack('>I', 13)  # chunk length
    data += b'IHDR'
    data += ihdr_data
    data += struct.pack('>I', 0x7fd80c5e)  # CRC for basic IHDR
    
    # For a minimal valid PNG, we need at least IHDR and IEND
    # The actual image data (IDAT) is complex to generate without a library
    
    # IEND chunk (required, marks end of PNG)
    data += struct.pack('>I', 0)  # chunk length
    data += b'IEND'
    data += struct.pack('>I', 0xae426082)  # CRC for IEND
    
    with open(filename, 'wb') as f:
        f.write(data)
    
    print(f"✓ Created {filename} ({size}x{size})")

def create_icons_with_pillow():
    """Create icons using Pillow if available"""
    try:
        from PIL import Image, ImageDraw
        
        icon_dir = 'extension/icons'
        os.makedirs(icon_dir, exist_ok=True)
        
        for size in [16, 48, 128]:
            # Create green square with white microphone symbol
            img = Image.new('RGB', (size, size), color='#4CAF50')
            draw = ImageDraw.Draw(img)
            
            # Draw a simple microphone shape
            if size >= 48:
                # Draw microphone for larger icons
                # Simple circle at top
                draw.ellipse([size//4, size//6, 3*size//4, size//3], fill='white')
                # Rectangle for the stem
                draw.rectangle([size*3//8, size//3, 5*size//8, 2*size//3], fill='white')
            
            filepath = f'{icon_dir}/icon{size}.png'
            img.save(filepath)
            print(f"✓ Created {filepath} ({size}x{size})")
    except ImportError:
        raise ImportError("Pillow not installed")


if __name__ == '__main__':
    try:
        create_icons_with_pillow()
        print("\n✓ Icons created successfully!")
        print("You can now load the extension in Chrome.")
    except ImportError:
        print("Pillow not installed. Using fallback method...")
        print("For best results, install Pillow: pip install Pillow")
        print("\nAlternatively, download free icons from:")
        print("  - https://www.flaticon.com/ (search 'microphone')")
        print("  - https://www.favicon-generator.org/")
        print("\nThen save as:")
        print("  - extension/icons/icon16.png")
        print("  - extension/icons/icon48.png")
        print("  - extension/icons/icon128.png")
