import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getReviewSummary,
  listReviewsAbout,
  type Review,
  type ReviewSummary,
} from "@data";

import { IconSymbol } from "@ui/components/icons/icon-symbol";
import { Colors } from "@ui/constants/theme";
import { useColorScheme } from "@ui/hooks/use-color-scheme";

type DriverReviewsProps = {
  driverId: string;
  driverName: string;
  routeLabel: string;
  canChat: boolean;
  onChat: () => void;
};

const REVIEWS_FETCH_LIMIT = 50;
const COLLAPSED_REVIEW_COUNT = 2;

export function DriverReviews({
  driverId,
  driverName,
  routeLabel,
  canChat,
  onChat,
}: DriverReviewsProps) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(false);
    setSummary(null);
    setReviews([]);
    setExpanded(false);

    Promise.all([
      getReviewSummary(driverId),
      listReviewsAbout(driverId, REVIEWS_FETCH_LIMIT),
    ])
      .then(([nextSummary, nextReviews]) => {
        if (!active) {
          return;
        }
        setSummary(nextSummary);
        setReviews(nextReviews);
      })
      .catch(() => {
        if (active) {
          setError(true);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [driverId, reloadKey]);

  const textualReviews = useMemo(
    () => reviews.filter((review) => review.text?.trim()),
    [reviews],
  );
  const visibleReviews = expanded
    ? textualReviews
    : textualReviews.slice(0, COLLAPSED_REVIEW_COUNT);

  return (
    <>
      <View style={[styles.driverCard, { borderColor: colors.icon }]}>
        <IconSymbol name="car.fill" size={22} color={colors.tint} />
        <View style={styles.driverCopy}>
          <View style={styles.driverTitleRow}>
            <Text
              style={[styles.driverName, { color: colors.text }]}
              numberOfLines={1}
            >
              {driverName}
            </Text>
            <RatingBadge
              loading={loading}
              error={error}
              summary={summary}
              colors={colors}
            />
          </View>
          <Text style={{ color: colors.icon }} numberOfLines={1}>
            {routeLabel}
          </Text>
        </View>
        {canChat ? (
          <Pressable
            onPress={onChat}
            style={[styles.chatButton, { backgroundColor: colors.tint }]}
            accessibilityRole="button"
            accessibilityLabel={`Conversar com ${driverName}`}
          >
            <IconSymbol name="bubble.left.fill" size={20} color="#fff" />
          </Pressable>
        ) : null}
      </View>

      <View
        style={[
          styles.reviewsCard,
          {
            backgroundColor: scheme === "dark" ? "#202325" : "#F7F8F9",
            borderColor: scheme === "dark" ? "#3A3F43" : "#DDE1E4",
          },
        ]}
      >
        <View style={styles.reviewsHeader}>
          <View style={styles.reviewsTitleRow}>
            <IconSymbol name="star.fill" size={18} color="#F9A825" />
            <Text style={[styles.reviewsTitle, { color: colors.text }]}>
              Avaliações do motorista
            </Text>
          </View>
          {!loading && summary ? (
            <Text style={[styles.reviewCount, { color: colors.icon }]}>
              {summary.reviewCount} {summary.reviewCount === 1 ? "nota" : "notas"}
            </Text>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.tint} />
            <Text style={{ color: colors.icon }}>Carregando avaliações...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <Text style={{ color: colors.icon }}>
              Não foi possível carregar as avaliações.
            </Text>
            <Pressable
              onPress={() => setReloadKey((current) => current + 1)}
              accessibilityRole="button"
            >
              <Text style={[styles.retry, { color: colors.tint }]}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : summary?.reviewCount === 0 ? (
          <Text style={{ color: colors.icon }}>
            Este motorista ainda não recebeu avaliações.
          </Text>
        ) : textualReviews.length === 0 ? (
          <Text style={{ color: colors.icon }}>
            As avaliações recebidas ainda não têm comentários escritos.
          </Text>
        ) : (
          <>
            <Text style={[styles.commentsLabel, { color: colors.icon }]}>
              Comentários recentes
            </Text>
            {visibleReviews.map((review) => (
              <ReviewItem key={review.id} review={review} colors={colors} />
            ))}
            {textualReviews.length > COLLAPSED_REVIEW_COUNT ? (
              <Pressable
                style={styles.expandButton}
                onPress={() => setExpanded((current) => !current)}
                accessibilityRole="button"
              >
                <Text style={[styles.expandText, { color: colors.tint }]}>
                  {expanded
                    ? "Mostrar menos"
                    : `Ver todos os ${textualReviews.length} comentários`}
                </Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    </>
  );
}

function RatingBadge({
  loading,
  error,
  summary,
  colors,
}: {
  loading: boolean;
  error: boolean;
  summary: ReviewSummary | null;
  colors: (typeof Colors)["light"];
}) {
  const label = loading || error
    ? "—"
    : summary?.averageRating != null
      ? summary.averageRating.toFixed(1)
      : "Novo";

  return (
    <View style={styles.ratingBadge}>
      <IconSymbol name="star.fill" size={15} color="#F9A825" />
      <Text style={[styles.ratingValue, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

function ReviewItem({
  review,
  colors,
}: {
  review: Review;
  colors: (typeof Colors)["light"];
}) {
  return (
    <View style={[styles.reviewItem, { borderTopColor: colors.icon }]}>
      <View style={styles.reviewMeta}>
        <Text style={[styles.reviewerName, { color: colors.text }]}>
          {review.raterName}
        </Text>
        <View style={styles.reviewRating}>
          <IconSymbol name="star.fill" size={14} color="#F9A825" />
          <Text style={[styles.reviewRatingText, { color: colors.text }]}>
            {review.rating.toFixed(1)}
          </Text>
        </View>
      </View>
      <Text style={[styles.reviewDate, { color: colors.icon }]}>
        {review.createdAt.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </Text>
      <Text style={[styles.reviewText, { color: colors.text }]}>
        {review.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  driverCard: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  driverCopy: { flex: 1, gap: 3 },
  driverTitleRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  driverName: { flexShrink: 1, fontSize: 18, fontWeight: "700" },
  ratingBadge: {
    alignItems: "center",
    backgroundColor: "rgba(249, 168, 37, 0.14)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ratingValue: { fontSize: 13, fontWeight: "800" },
  chatButton: {
    alignItems: "center",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  reviewsCard: { borderRadius: 12, borderWidth: 1, gap: 10, padding: 14 },
  reviewsHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  reviewsTitleRow: { alignItems: "center", flexDirection: "row", gap: 7 },
  reviewsTitle: { fontSize: 16, fontWeight: "700" },
  reviewCount: { fontSize: 12, fontWeight: "600" },
  loadingRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  emptyState: { gap: 6 },
  retry: { fontSize: 14, fontWeight: "700" },
  commentsLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  reviewItem: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
    paddingTop: 10,
  },
  reviewMeta: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  reviewerName: { flex: 1, fontSize: 14, fontWeight: "700" },
  reviewRating: { alignItems: "center", flexDirection: "row", gap: 3 },
  reviewRatingText: { fontSize: 13, fontWeight: "700" },
  reviewDate: { fontSize: 12 },
  reviewText: { fontSize: 14, lineHeight: 20 },
  expandButton: { alignItems: "center", paddingTop: 4 },
  expandText: { fontSize: 14, fontWeight: "700" },
});
