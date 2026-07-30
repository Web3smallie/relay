import { GraphQLClient, gql } from "graphql-request";
import dotenv from "dotenv";

dotenv.config();

const client = new GraphQLClient(process.env.SALEOR_API_URL as string, {
  headers: { Authorization: `Bearer ${process.env.SALEOR_APP_TOKEN}` },
});

const SEARCH_QUERY = gql`
  query SearchProducts($filter: ProductFilterInput, $channel: String!) {
    products(first: 10, filter: $filter, channel: $channel) {
      edges {
        node {
          id
          name
          thumbnail {
            url
          }
          pricing {
            priceRange {
              start {
                gross {
                  amount
                  currency
                }
              }
            }
          }
          variants {
            id
            quantityAvailable
          }
        }
      }
    }
  }
`;

client
  .request(SEARCH_QUERY, { filter: { search: "apple juice" }, channel: "default-channel" })
  .then((d) => console.log("SUCCESS:", JSON.stringify(d, null, 2)))
  .catch((e) => console.error("FAILED:", JSON.stringify(e, null, 2)));