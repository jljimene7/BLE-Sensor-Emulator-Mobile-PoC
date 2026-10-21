# Project Description

This project aims to develop a simple mobile application for Android and iOS. The goal is to
demonstrate the planning, development, and release of a mobile app through the Google Play
Store and Apple App Store.

This is not intended to create production-grade infrastructure, solve an immediate client
problem, or consume a large amount of time and resources. The goal is a demonstration
application that works on both Android and iOS.

## Project Plan

### Timeline

There is no fixed timeline for this personal project. It can be completed at any time. We will
periodically check in and share updates about potential paid mobile app projects, but the
schedule for this project is up to you.

### Phases

The project has three phases:

1. Project Architecture
2. Project Execution
3. Production Release and Validation

## Project Requirements

You own the requirements and may choose a different direction if you prefer. The primary goal
is a successful app release that meets the requirements you define.

The initial concept is a simple Bluetooth Low Energy (BLE) server that communicates with a BLE
client running on a computer or single-board computer (SBC). The app shares an example data
packet when the user presses a button.

This concept was chosen to demonstrate a real-world application that we might ask you to build
in the future: an emulator for a physical sensor that has not yet been built.

If you choose this approach, an example data packet could contain an 8 × 8 matrix of random
values and a device ID:

```text
[
  [x, x, x, x, x, x, x, x],
  [x, x, x, x, x, x, x, x],
  [x, x, x, x, x, x, x, x],
  [x, x, x, x, x, x, x, x],
  [x, x, x, x, x, x, x, x],
  [x, x, x, x, x, x, x, x],
  [x, x, x, x, x, x, x, x],
  [x, x, x, x, x, x, x, x]
]
```

The packet also includes a device ID.

## Project Deliverables

### Project Architecture

The architecture deliverable is a concise project scope of work covering:

1. The general technical approach and project requirements (what will be built).
2. The tools to be used (for example, cloud services, authentication, and analytics).
3. The mobile application's software architecture.
4. The project timeline.

### Project Execution

Build and iterate on the app. Ryan will test iterations as requested using Apple TestFlight and
Google Play's beta-testing tools. This phase covers the coding portion of the project.

### Production Release and Validation

The final deliverable is a mobile app released on the Apple App Store and Google Play Store and
tested against the requirements established during Phase 1. Success means the app meets its
requirements on both platforms.

## Required Project Tooling

Most software tools, libraries, and products are at your discretion. The following are required:

1. An iPhone for testing (provided by you).
2. An Android test phone (provided by Conifer).
3. The Expo framework for React Native.
4. React Native for cross-platform mobile development.
5. An Apple Developer Program account ($99/year; Conifer can provide one).
6. A Google Play Console developer account ($25 one-time fee; Conifer can provide one).
7. Expo Application Services (EAS; Conifer can provide access).
8. A privacy policy URL. Both app stores require one, even for a trivial app. The policy must
   be hosted somewhere; GitHub Pages is an option.
 