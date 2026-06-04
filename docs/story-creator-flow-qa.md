# OPREALM Story Creator Flow QA Playbook

Use this checklist whenever we change the home idea input, world creator, character creator, storyboard builder, or image generation flow.

## Goal

Verify the child-facing creation path works cleanly:

Home Describe Anything -> loading/transition -> World Creator -> Character Creator -> Story Builder -> generate at least 6 scene cards.

The flow should feel blank and intentional until the creator adds or generates something. No old placeholder characters, worlds, prompts, volcano defaults, or cached images should appear unless editing a saved project.

## Fast Local Setup

1. Start the local Pages server if it is not already running.
2. Use the current local URL, usually `http://127.0.0.1:8791`.
3. Hard refresh the browser and clear local storage only when testing first-run behavior.
4. Keep a separate run where local storage remains intact to test saved-project behavior.

## Static Sanity Checks

Run these after editing JavaScript or HTML:

```powershell
& "C:\Users\malcr\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --check "public\storyboard-character.js"
& "C:\Users\malcr\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --check "public\storyboard-world.js"
& "C:\Users\malcr\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --check "public\storyboard.js"
```

Use `Invoke-WebRequest` to quickly confirm first-load blank states:

```powershell
$characterHtml = (Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:8791/storyboard-character").Content
[pscustomobject]@{
  HasCharacterBlank = $characterHtml -match 'id="characterPreviewBlank"'
  HasLiveBlank = $characterHtml -match 'id="characterLiveBlank"'
  HasOldKaiSummary = $characterHtml -match '<dd>Kai</dd>'
  HasOldPrompt = $characterHtml -match 'A young boy with messy brown hair'
}

$worldHtml = (Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:8791/storyboard-world").Content
[pscustomobject]@{
  HasWorldBlank = $worldHtml -match 'No world image yet'
  HasWorldPrompt = $worldHtml -match 'World Prompt'
  HasWorldHook = $worldHtml -match 'World Hook'
  HasWorldRules = $worldHtml -match 'World Rules'
}
```

Expected:

- Character blank and live blank are `True`.
- Old Kai summary and old prompt are `False`.
- World blank and world prompt are `True`.
- World Hook and World Rules are `False`.

## Manual Simulation Path

1. Go to `/`.
2. Use the Describe Anything input with a fresh idea.
3. Confirm it does not route to the old Realm Spark page.
4. Confirm it transitions to `/storyboard-world`.
5. On World Creator:
   - Custom World is first/default.
   - Preview starts blank.
   - Generate World button is visible.
   - World Prompt (Description) exists.
   - World Hook, World Type, and World Rules are removed.
6. Save or continue to Character Creator.
7. On Character Creator:
   - Main image preview starts blank.
   - Live preview starts blank.
   - No hardcoded Kai image or prompt appears.
   - Generated image appears only after pressing Generate Character.
   - Enlarge/download are disabled until an image exists.
8. Save character and continue.
9. On Story Builder:
   - Character/world cards are populated from saved data.
   - Text has enough width on mobile.
   - Scene cards are compact on mobile.
   - Scene image area is large.
   - Removed right-side per-scene action panel stays removed.
   - Generate Image button exists under character/world tags.
10. Create at least 6 scenes:
   - Add Scene works repeatedly.
   - Scene prompts are editable.
   - AI Assist can populate or improve prompts.
   - Scene ordering controls work.
   - Generated scenes do not overwrite earlier scene previews.

## Generator Checks

Use real generation sparingly to save credits. Prefer one full generation per changed surface, then use static and UI checks for layout changes.

Check these endpoints indirectly from the UI:

- `/api/story-character-image`
- `/api/story-scene-images`
- `/api/story-character-image` with changed style/color/component

For each generation:

- Confirm unauthenticated users see a clear login message.
- Confirm logged-in users consume credits only after successful generation.
- Confirm empty image results show an actionable error.
- Confirm the generated image is stored in the current project state.
- Confirm stale cached images are not reused for a different prompt.

## Common Regressions To Watch

- First saved character auto-loads when starting a fresh character.
- Old placeholder Kai, volcano, lava, or magic portal data appears.
- Style thumbnails set the preview image before generation.
- Hidden image tags still reserve space or show broken image icons.
- Mobile sticky prompt bar blocks content.
- Duplicate nav bars return.
- Storyboard scene drag handles are visible but not functional.
- Scene cards get too tall on mobile.
- Character/world cards have narrow text columns.
- Buttons have text top-aligned instead of centered.
- Download buttons render but do not trigger a download.

## Efficiency Notes

- Use `rg` first to find hardcoded placeholders.
- Use `node --check` before opening the browser.
- Use `Invoke-WebRequest` for fast HTML state checks.
- Use browser inspection only after static checks pass.
- Test blank first-run and saved-project edit as separate cases.
- Avoid real AI generation until layout/state issues are fixed.
