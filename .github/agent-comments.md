# Professional Code Commenting Rules

## Purpose

Apply these rules whenever reviewing, writing, or modifying code in this repository.

The goal is to keep code professionally documented for future engineers without adding noisy, redundant, or misleading comments.

## Core Rule

Comment why, assumptions, constraints, and non-obvious behavior.

Do not comment obvious syntax or simply restate what the code already says. Prefer clear names and simple code over excessive comments.

## Required Commenting Standard

When adding or modifying code:

- Preserve the existing local code style and terminology.
- Add or update comments whenever the reasoning would not be obvious to another engineer reading the code later.
- Keep comments accurate when behavior changes. Never leave stale comments.
- Use concise, grammatically complete English sentences with proper capitalization and punctuation.
- Keep comments close to the code they explain.
- Avoid large blocks of commentary when clearer code or a small helper function would communicate the intent better.

## Docstrings

Add docstrings for:

- Public modules, classes, functions, and methods.
- Non-trivial functions.
- Functions whose behavior, inputs, outputs, units, side effects, or assumptions are not obvious from the signature.

A useful function docstring should explain, when relevant:

- What the function accomplishes.
- Important inputs and expected units or formats.
- What is returned.
- Important side effects.
- Exceptions or failure conditions.
- Non-obvious assumptions or constraints.

Do not add docstrings that only repeat the function name.

## Inline and Block Comments

Add comments for:

- Non-obvious algorithms.
- Mathematical transformations.
- Coordinate-frame conversions.
- Camera-pose conventions.
- Unit conversions.
- Numerical tolerances or thresholds.
- Workarounds for library or tool limitations.
- Performance-sensitive decisions.
- Domain-specific assumptions.
- Safety or hardware constraints.
- Behavior that might otherwise look accidental.
- Reasons for choosing one implementation over a simpler-looking alternative.

Place explanatory comments immediately before the relevant block. Use inline comments sparingly and only when a short clarification is sufficient.

## Experiment and Research Code

For experiment scripts, document:

- What experiment the script runs.
- Inputs and expected directory structure.
- Parameters intentionally held constant.
- Parameters being varied.
- Output files and metrics.
- Random seeds when applicable.
- Failure handling.
- Any assumptions that affect reproducibility.

Where practical, record the reason a parameter was selected rather than merely describing its numeric value.

## Bad Comments to Avoid

Avoid comments that repeat the code:

```python
i += 1  # Increment i.
images = load_images(path)  # Load images.
for camera in cameras:  # Loop through cameras.
```

Prefer comments that preserve reasoning:

```python
# Match by filename rather than COLMAP image ID because image IDs are not
# guaranteed to preserve Blender render order.

# COLMAP stores image poses as world-to-camera transforms. Convert to
# camera-to-world before comparing against Blender's camera.matrix_world.

# Keep the synthetic intrinsics fixed so this experiment isolates extrinsic
# estimation error rather than mixing intrinsic and extrinsic uncertainty.
```


## Before Finishing a Code Change

- Review every new comment for accuracy.
- Remove comments that merely narrate the code.
- Confirm non-obvious math, coordinate conventions, assumptions, and units are documented.
- Confirm public or non-trivial functions have useful docstrings.
- Update nearby existing comments if the implementation changed their meaning.
- Keep comments concise enough that the code remains easy to scan.

## Review Behavior

When reviewing existing code:

- Flag missing comments only when context or reasoning is genuinely unclear.
- Flag stale, misleading, duplicated, or excessive comments.
- Do not recommend comments for self-explanatory code.
- Prefer refactoring unclear code over adding a paragraph that explains poor structure.

## Priority

Correctness and clarity come first. A smaller amount of accurate, useful documentation is better than heavily commented code that repeats implementation details or becomes outdated.

## Creating context 
Also, ensure you add context or a .md file inside the docs/context/ folders to keep track of what has been done. Additionally, make sure to add the changes on the main README file. Make them concise and simply explain how to run the code that was written. 