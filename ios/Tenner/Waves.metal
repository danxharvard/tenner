#include <metal_stdlib>
#include <SwiftUI/SwiftUI.h>
using namespace metal;

// Waves: when you change the look, a picture of the old one rolls away in rings from where you tapped, rippling as it
// goes, and the new look is already underneath.
//   origin  where you tapped (points)
//   t       seconds since the tap
//   reach   the distance from there to the farthest corner
//   span    how long the front takes to cross the screen
[[ stitchable ]] half4 tennerWaves(float2 p, SwiftUI::Layer layer, float2 origin, float t, float reach, float span) {
    float2 v = p - origin;
    float d = length(v);
    float2 dir = d > 0.5 ? v / d : float2(0.0);

    // the front eases out, slowing as it reaches the edges
    float k = clamp(t / span, 0.0, 1.0);
    float eased = 1.0 - pow(1.0 - k, 3.0);
    float front = eased * (reach + 80.0);
    float gap = d - front;                 // how far ahead of the front this point is
    if (gap <= 0.0) return half4(0.0);     // the new look shows through

    // rings just ahead of the front, fading with distance from it and as the wave runs out
    float band = exp(-gap / 110.0) * (1.0 - 0.55 * k);
    float wave = sin(gap * 0.09 - t * 16.0) * band;
    half4 c = layer.sample(p + dir * wave * 22.0);

    // a soft light along each crest, and a feathered edge where the old look ends
    c.rgb = min(c.rgb + half(0.10 * max(wave, 0.0)) * c.a, half3(c.a));
    return c * half(smoothstep(0.0, 28.0, gap));
}
