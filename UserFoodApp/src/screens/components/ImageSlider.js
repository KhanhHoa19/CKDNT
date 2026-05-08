import { useRef, useState } from "react";
import {
    Dimensions,
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";

const { width: SCREEN_W } = Dimensions.get("window");

export default function ImageSlider({ images }) {
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const flatRef = useRef(null);

  if (!images || images.length === 0) return null;

  return (
    <View>
      <FlatList
        ref={flatRef}
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
          setActiveImgIdx(idx);
        }}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={styles.sliderImg} />
        )}
      />

      {/* Dots */}
      {images.length > 1 && (
        <View style={styles.dotsRow}>
          {images.map((_, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.dot, i === activeImgIdx && styles.dotActive]}
              onPress={() => {
                flatRef.current?.scrollToIndex({ index: i, animated: true });
                setActiveImgIdx(i);
              }}
            />
          ))}
        </View>
      )}

      {/* Thumbnails */}
      {images.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.thumbRow}
        >
          {images.map((img, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                flatRef.current?.scrollToIndex({ index: i, animated: true });
                setActiveImgIdx(i);
              }}
            >
              <Image
                source={{ uri: img }}
                style={[styles.thumb, i === activeImgIdx && styles.thumbActive]}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sliderImg: { width: SCREEN_W, height: 300, resizeMode: "cover" },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ddd" },
  dotActive: { width: 18, backgroundColor: "#FF6B35" },
  thumbRow: { paddingHorizontal: 16, paddingVertical: 10 },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: 8,
    opacity: 0.6,
  },
  thumbActive: { opacity: 1, borderWidth: 2, borderColor: "#FF6B35" },
});
