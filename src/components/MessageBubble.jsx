import { memo, useMemo } from 'react';
import { View, Text, Pressable, Image, Platform } from 'react-native';
import { Check, CheckCheck, FileText, FileSpreadsheet, File as FileIcon, ChevronDown, AlertCircle, Clock } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { nameColor } from '../theme/colors';
import { hhmm, fileSize } from '../lib/format';
import { absoluteUrl } from '../config';
import { VoiceBubble } from './VoiceBubble';

function parseSystem(m) {
  try { return JSON.parse(m.systemPayload || '{}').text || ''; } catch { return ''; }
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Mətni @etiketlərə görə hissələrə böl. */
function renderText(text, names, colors) {
  if (!text) return null;
  if (!names.length) return text;
  const re = new RegExp(`(@(?:${names.map(esc).join('|')}))`, 'g');
  return text.split(re).map((part, i) => (
    names.some((n) => part === '@' + n)
      ? <Text key={i} style={{ color: colors.brand, fontWeight: '700' }}>{part}</Text>
      : part
  ));
}

function FileRow({ a, mine, colors }) {
  const sheet = /sheet|excel|xls/i.test(a.mimeType) || /\.xlsx?$/i.test(a.fileName);
  const Icon = sheet ? FileSpreadsheet : /pdf/i.test(a.mimeType) ? FileText : FileIcon;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, backgroundColor: colors.sunk, minWidth: 200 }}>
      <Icon size={26} color={sheet ? colors.green : /pdf/i.test(a.mimeType) ? colors.red : colors.muted} />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ color: colors.ink, fontWeight: '600', fontSize: 13.5 }}>{a.fileName}</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{fileSize(a.sizeBytes)}</Text>
      </View>
    </View>
  );
}

/**
 * status: 'pending' | 'failed' | 'sent' | 'read-some' | 'read-all' (yalnız öz mesajlarım üçün)
 */
function BubbleBase({ message: m, mine, showSender, mentionNames, status, onLongPress, onOpenImage, onOpenFile, onRetry, onJumpTo, myId, onReact }) {
  const { colors } = useTheme();
  const names = useMemo(() => mentionNames ?? [], [mentionNames]);

  if (m.type === 'SYSTEM') {
    return (
      <View style={{ alignItems: 'center', marginVertical: 6 }}>
        <Text style={{ color: colors.muted, fontSize: 12.5, backgroundColor: colors.sunk, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, overflow: 'hidden' }}>
          {parseSystem(m)}
        </Text>
      </View>
    );
  }

  const bg = mine ? colors.mine : colors.theirs;
  const images = (m.attachments || []).filter((a) => a.kind === 'IMAGE');
  const voices = (m.attachments || []).filter((a) => a.kind === 'VOICE');
  const files = (m.attachments || []).filter((a) => a.kind === 'FILE');
  const mentionedMe = m.mentionIds?.includes(myId);

  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginVertical: 2, paddingHorizontal: 10 }}>
      <Pressable
        onLongPress={() => onLongPress?.(m)}
        delayLongPress={300}
        // Web: sağ klik də əməliyyatları açır
        {...(Platform.OS === 'web' ? { onContextMenu: (e) => { e.preventDefault?.(); onLongPress?.(m); } } : {})}
        style={{
          maxWidth: '82%', minWidth: 90, borderRadius: 16, padding: 9, paddingBottom: 6, backgroundColor: bg,
          borderTopRightRadius: mine ? 4 : 16, borderTopLeftRadius: mine ? 16 : 4,
          borderWidth: mentionedMe && !mine ? 1.5 : 0, borderColor: colors.brand,
          shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1,
        }}
      >
        {!mine && showSender ? (
          <Text style={{ color: nameColor(m.sender?.id), fontWeight: '700', fontSize: 13.5, marginBottom: 2 }}>{m.sender?.fullName}</Text>
        ) : null}

        {m.deleted ? (
          <Text style={{ color: colors.muted, fontStyle: 'italic', fontSize: 14.5 }}>🚫 Bu mesaj silindi</Text>
        ) : (
          <>
            {m.replyTo ? (
              <Pressable
                onPress={() => onJumpTo?.(m.replyTo.id)}
                style={{ borderLeftWidth: 4, borderLeftColor: nameColor(m.replyTo.sender?.id), backgroundColor: colors.sunk, borderRadius: 8, padding: 7, marginBottom: 5 }}
              >
                <Text style={{ color: nameColor(m.replyTo.sender?.id), fontWeight: '700', fontSize: 12.5 }}>{m.replyTo.sender?.fullName}</Text>
                <Text numberOfLines={2} style={{ color: colors.ink2, fontSize: 13 }}>
                  {m.replyTo.deleted ? 'Mesaj silindi' : m.replyTo.text || (m.replyTo.attachmentKind === 'IMAGE' ? '📷 Şəkil' : '📎 Fayl')}
                </Text>
              </Pressable>
            ) : null}

            {images.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginBottom: m.text ? 5 : 0, width: images.length > 1 ? 232 : undefined }}>
                {images.map((a) => {
                  const w = images.length > 1 ? 114 : 232;
                  const h = images.length > 1 ? 114 : Math.min(300, a.width && a.height ? (232 * a.height) / a.width : 232);
                  return (
                    <Pressable key={a.id} onPress={() => onOpenImage?.(a, images)}>
                      <Image source={{ uri: absoluteUrl(a.thumbUrl || a.url) }} style={{ width: w, height: h, borderRadius: 10, backgroundColor: colors.sunk }} resizeMode="cover" />
                    </Pressable>
                  );
                })}
              </View>
            )}
            {voices.map((a) => (
              <View key={a.id} style={{ marginBottom: m.text ? 5 : 0 }}><VoiceBubble attachment={a} mine={mine} /></View>
            ))}
            {files.map((a) => (
              <Pressable key={a.id} onPress={() => onOpenFile?.(a)} style={{ marginBottom: m.text ? 5 : 0 }}>
                <FileRow a={a} mine={mine} colors={colors} />
              </Pressable>
            ))}
            {m.text ? <Text style={{ color: colors.ink, fontSize: 15.5, lineHeight: 21 }}>{renderText(m.text, names, colors)}</Text> : null}
          </>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 3 }}>
          {m.editedAt && !m.deleted ? <Text style={{ color: colors.faint, fontSize: 11 }}>redaktə edilib</Text> : null}
          <Text style={{ color: colors.faint, fontSize: 11.5 }}>{hhmm(m.createdAt)}</Text>
          {mine ? <Ticks status={status} colors={colors} onRetry={() => onRetry?.(m)} /> : null}
        </View>

        {!m.deleted && (
          <Pressable onPress={() => onLongPress?.(m)} hitSlop={8} accessibilityLabel="Mesaj əməliyyatları" style={{ position: 'absolute', top: 3, right: 4, opacity: Platform.OS === 'web' ? 0.55 : 0 }}>
            <ChevronDown size={16} color={colors.muted} />
          </Pressable>
        )}
      </Pressable>

      {m.reactions?.length > 0 && !m.deleted && (
        <View style={{ flexDirection: 'row', gap: 4, marginTop: -6, marginHorizontal: 8, flexWrap: 'wrap' }}>
          {m.reactions.map((r) => (
            <Pressable
              key={r.emoji}
              onPress={() => onReact?.(m, r.emoji)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, height: 24, borderRadius: 12,
                backgroundColor: r.userIds.includes(myId) ? colors.brandTint : colors.surface,
                borderWidth: 1, borderColor: r.userIds.includes(myId) ? colors.brandLine : colors.line,
              }}
            >
              <Text style={{ fontSize: 13 }}>{r.emoji}</Text>
              {r.count > 1 ? <Text style={{ color: colors.ink2, fontSize: 11.5, fontWeight: '700' }}>{r.count}</Text> : null}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function Ticks({ status, colors, onRetry }) {
  if (status === 'pending') return <Clock size={13} color={colors.faint} />;
  if (status === 'failed') {
    return (
      <Pressable onPress={onRetry} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <AlertCircle size={14} color={colors.red} />
        <Text style={{ color: colors.red, fontSize: 11.5, fontWeight: '700' }}>Göndərilmədi · təkrar</Text>
      </Pressable>
    );
  }
  if (status === 'read-all') return <CheckCheck size={16} color={colors.brand} />;
  if (status === 'read-some') return <CheckCheck size={16} color={colors.faint} />;
  return <Check size={15} color={colors.faint} />;
}

export const MessageBubble = memo(BubbleBase);
