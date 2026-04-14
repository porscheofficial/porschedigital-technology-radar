---
title: "SwiftUI"
ring: assess
quadrant: languages-and-frameworks
tags:
  - mobile
teams:
  - cayenne
  - taycan
links:
  - url: https://developer.apple.com/xcode/swiftui/
    name: Apple SwiftUI
  - url: https://developer.apple.com/tutorials/swiftui
    name: SwiftUI Tutorials
  - url: https://github.com/apple/swift
    name: Swift on GitHub
---

SwiftUI continues in assess. The Taycan team has joined the evaluation, building a prototype for their companion app settings screen. While the declarative syntax accelerates development, we have encountered limitations with complex navigation patterns and custom transition animations that require falling back to UIKit.

## Evaluation Context

Our iOS apps currently use UIKit with a coordinator-based navigation pattern. SwiftUI promises faster UI development and better alignment with our declarative approach on the web ([[react]]), but we need to validate it handles our specific requirements.

## What Works Well

- **Previews** — Xcode previews provide instant visual feedback, similar to [[storybook]] for web components. This dramatically speeds up UI iteration.
- **Declarative layout** — composing views with modifiers feels natural to developers coming from React. Knowledge transfer between web and mobile teams has improved.
- **[[design-tokens]] integration** — our token system translates cleanly to SwiftUI's `Color` and `Font` extensions, maintaining visual consistency across platforms.

## Where We Hit Limits

- **Navigation** — `NavigationStack` (iOS 16+) works for simple hierarchies but struggles with our complex flows: deep links, conditional auth gates, and multi-step configuration wizards
- **Custom transitions** — our signature vehicle reveal animation requires UIKit's `UIViewControllerAnimatedTransitioning` protocol; SwiftUI's `matchedGeometryEffect` cannot replicate it
- **UIKit interop overhead** — wrapping UIKit views in `UIViewRepresentable` works but creates maintenance burden and testing complexity

## Decision Timeline

We will make a go/no-go decision on SwiftUI adoption by end of Q4 2025. The key criterion: can we build the Taycan companion app's settings module entirely in SwiftUI without UIKit fallbacks for core functionality? If yes, new screens will default to SwiftUI. If not, we continue with UIKit and revisit when SwiftUI's navigation and animation APIs mature further.
