import styled from "@emotion/styled";
import { bp } from "../../constants";

const TrackgroupGrid = styled.div`

              display: flex;
              width: 100%;
              flex-direction: row;
              flex-wrap: wrap;
              white-space: nowrap;

              a:first-child {
                font-size: var(--mi-font-size-small);
              }
              a:last-child {
                font-size: var(--mi-font-size-small);
              }

              > div {
                flex: 23.5%;
                max-width: 23.5%;
                margin-left: 0 !important;
                margin-right: 2% !important;
                padding: 0 !important;

                :nth-child(4n) {
                  margin-left: 0 !important;
                  margin-right: 0 !important;
                }
                
                @media screen and (max-width: ${bp.medium}px) {

                  a:first-child {
                    font-size: var(--mi-font-size-xsmall);
                  }
                  a:last-child {
                    font-size: var(--mi-font-size-xsmall);
                  }

                  max-width: 32%;
                  flex: 32%;
                  margin-right: 2% !important;
                  margin-left: 0 !important;

                  :nth-child(3n) {
                    border-top: 0;
                    margin-left: 0rem !important;
                    margin-right: 0rem !important;
                  }
                  :nth-child(4n) {
                    margin-left: 0 !important;
                    margin-right: 2% !important;
                  }
                }

                @media screen and (max-width: ${bp.small}px) {

                  max-width: 48.5%;
                  flex: 48.5%;
                  margin-bottom: 1rem;
                  
                  &:nth-child(odd) {
                    margin-left: 0rem !important;
                    margin-right: 1.5% !important;
                  }

                  &:nth-child(even) {
                    margin-right: 0rem !important;
                    margin-left: 1.5% !important;
                  }
              }
`;

export default TrackgroupGrid;
