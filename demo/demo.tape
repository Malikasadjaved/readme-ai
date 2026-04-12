# readme-ai Demo Recording
# VHS tape file — https://github.com/charmbracelet/vhs
#
# Prerequisites:
#   brew install vhs   (or go install github.com/charmbracelet/vhs@latest)
#
# Usage:
#   vhs demo/demo.tape

# --- Terminal settings ---
Output demo/demo.cast
Set FontSize 16
Set Width 120
Set Height 35
Set Theme "Catppuccin Mocha"
Set TypingSpeed 50ms
Set Padding 20
Set Framerate 30

# --- Scene 1: Show the command ---
Sleep 500ms
Type "# Generate a README with readme-ai"
Enter
Sleep 1s

Type "npx @malikasadjaved/readme-ai --repo . --theme modern --dry-run"
Sleep 500ms
Enter

# --- Scene 2: Wait for the pipeline to run ---
# Phase 1: Fetching repository
Sleep 3s
# Phase 2: Analyzing code
Sleep 5s
# Phase 3: Generating sections with AI
Sleep 10s
# Phase 4: Rendering with theme
Sleep 2s
# Phase 5: Output (dry-run prints to stdout)
Sleep 3s

# --- Scene 3: Scroll through output ---
Sleep 2s
Type "# That's it! A full README in seconds."
Enter
Sleep 3s

# --- Take a final screenshot ---
Screenshot demo/demo-screenshot.png
