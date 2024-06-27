import { analytics } from "./AnalyticsInstance";

export function Telemetry(
  eventName: string,
  properties: Record<string, unknown>
) {
  // console.log({ SEGMENT_API_KEY: process.env.SEGMENT_API_KEY });
  analytics.track(eventName, properties);
}
