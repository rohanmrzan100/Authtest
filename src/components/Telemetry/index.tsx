import React from "react";
import { analytics } from "./AnalyticsInstance";

interface TelemetryProps {
  event: string;
  [key: string]: string;
}

/* <Telemetry event = "event" property_name = "propety value" property_x = "value_x"    /> */

const Telemetry: React.FC<TelemetryProps> = ({ event, ...props }) => {
  console.log(props);

  analytics.track(event, props);
  return <></>;
};

export default Telemetry;
