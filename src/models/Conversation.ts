import { Schema, model, Document } from 'mongoose';

interface IMessage {
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface IConversation extends Document {
  userId: Schema.Types.ObjectId;
  messages: IMessage[];
}

const messageSchema = new Schema<IMessage>({
  sender: { type: String, enum: ['user', 'ai'], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const conversationSchema = new Schema<IConversation>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  messages: [messageSchema],
});

const Conversation = model<IConversation>('Conversation', conversationSchema);

export default Conversation;