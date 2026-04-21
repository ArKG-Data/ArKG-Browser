import { SPARQLGraphExplorer } from "@millenniumdb/graph-explorer";
import { Container, useMantineColorScheme } from "@mantine/core";
import { driver } from "@millenniumdb/driver";
import "./Graph.css"

const driverInstance = driver("https://arkg.cl/api/");

const args = {
    searchKeys: ['<http://www.w3.org/2000/01/rdf-schema#label>'],
    nameKeys: ['<http://www.w3.org/2000/01/rdf-schema#label>'],
    labelsKey: "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>",
    prefixes: {
      arkg: "https://arkg.cl/",
      wd: "http://www.wikidata.org/entity/",
      wdt: "http://www.wikidata.org/prop/direct/",
      rdfs: "http://www.w3.org/2000/01/rdf-schema#"
    }
  }

export default function GraphPage() {
  const { colorScheme } = useMantineColorScheme();

  const bgColor = colorScheme === "dark" ? "rgb(36,36,36)" : "#ffffff";
  return (
    <Container
        fluid
        p="md"
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          marginTop: "5vh",
          backgroundColor: bgColor
        }}
      >
        <SPARQLGraphExplorer
          driver={driverInstance}
          initialSettings={args}
          style={{ flex: 1, marginBottom: "2.5vh",}}
        />
      </Container>
  );
}