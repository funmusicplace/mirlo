import React from "react";

import { TrackGroupWidgetData } from "../useTrackGroupWidgetData";

import Strip from "./Strip";

const Compact: React.FC<TrackGroupWidgetData> = (props) => (
  <Strip {...props} showTracklist={false} />
);

export default Compact;
