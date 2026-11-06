import { StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";

export function MapPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  return (
    <MapView
      key={`${lat},${lng}`}
      style={s.map}
      initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
      onPress={(e) => onChange(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)}
    >
      <Marker
        coordinate={{ latitude: lat, longitude: lng }}
        draggable
        onDragEnd={(e) => onChange(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)}
      />
    </MapView>
  );
}

const s = StyleSheet.create({
  map: { width: "100%", height: 220, borderRadius: 10, marginBottom: 4 },
});
