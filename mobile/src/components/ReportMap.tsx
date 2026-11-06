import { StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";

export function ReportMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <MapView
      style={s.map}
      scrollEnabled={false}
      zoomEnabled={false}
      region={{ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
    >
      <Marker coordinate={{ latitude: lat, longitude: lng }} />
    </MapView>
  );
}

const s = StyleSheet.create({
  map: { width: "100%", height: 180, borderRadius: 10, marginVertical: 8 },
});
