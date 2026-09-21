// uuid (used throughout store/*.ts) needs crypto.getRandomValues, which Hermes
// doesn't provide out of the box - this polyfill must load before anything
// else touches uuid, so it comes first, ahead of expo-router's own entry.
import "react-native-get-random-values";
import "expo-router/entry";
