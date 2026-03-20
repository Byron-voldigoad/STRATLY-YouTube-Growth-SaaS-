from PIL import Image, ImageDraw
import sys

def remove_bg(input_path, output_path):
    try:
        img = Image.open(input_path).convert("RGBA")
        width, height = img.size
        print(f"Loaded image {width}x{height}")
        
        # We want to replace the white background with transparency
        # but KEEP any white inside the logo.
        # We can use flood fill from the corners.
        transparent = (255, 255, 255, 0)
        
        # Helper function for BFS flood fill
        def flood_fill(start_x, start_y):
            # Target color: pixel at start
            target = img.getpixel((start_x, start_y))
            # If target is not white-ish, skip
            if target[0] < 240 or target[1] < 240 or target[2] < 240:
                print(f"Skipping corner {start_x},{start_y} - color is {target}")
                return
            
            # BFS queue
            queue = [(start_x, start_y)]
            # Visited set
            visited = set()
            visited.add((start_x, start_y))
            
            pixels = img.load()
            
            while queue:
                x, y = queue.pop(0)
                # Set pixel to transparent
                pixels[x, y] = transparent
                
                # Check neighbors
                for dx, dy in [(0, 1), (1, 0), (0, -1), (-1, 0)]:
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < width and 0 <= ny < height:
                        if (nx, ny) not in visited:
                            visited.add((nx, ny))
                            p = pixels[nx, ny]
                            # If pixel is close to white and not already transparent
                            if p[3] > 0 and p[0] > 240 and p[1] > 240 and p[2] > 240:
                                queue.append((nx, ny))

        print("Starting flood fill...")
        # Fill from corners
        flood_fill(0, 0)
        flood_fill(width-1, 0)
        flood_fill(0, height-1)
        flood_fill(width-1, height-1)
        
        # Also try middle edges just in case
        flood_fill(width//2, 0)
        flood_fill(width//2, height-1)
        flood_fill(0, height//2)
        flood_fill(width-1, height//2)

        img.save(output_path, "PNG")
        print(f"Saved to {output_path}")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

input_img = r"C:\Users\RAY\.gemini\antigravity\brain\5d4abad8-1c16-4dd0-b292-a4493052d4c9\media__1774005502663.png"
output_img = r"d:\expose\progammation\mes-stack\monthly-youtube-growth\stratly\src\assets\images\logo.png"

import os
os.makedirs(os.path.dirname(output_img), exist_ok=True)
remove_bg(input_img, output_img)
