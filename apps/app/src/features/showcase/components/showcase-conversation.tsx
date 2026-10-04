import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@v1/ui/components/attachment"
import { Avatar, AvatarFallback } from "@v1/ui/components/avatar"
import { Bubble, BubbleContent, BubbleGroup, BubbleReactions } from "@v1/ui/components/bubble"
import { Icon } from "@v1/ui/components/icon"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "@v1/ui/components/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@v1/ui/components/message-scroller"
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@v1/ui/components/questionnaire"
import { Spinner } from "@v1/ui/components/spinner"
import { toast } from "@v1/ui/components/toast"
import ShowcaseDemo from "#features/showcase/components/showcase-demo.tsx"
import ShowcaseSection from "#features/showcase/components/showcase-section.tsx"
import {
  ATTACHMENT_DESCRIPTIONS,
  ATTACHMENT_SIZES,
  ATTACHMENT_STATES,
  AVATAR_IMAGE_SRC,
  BUBBLE_VARIANTS,
  CONVERSATION,
  QUESTIONNAIRE_ITEMS,
  QUESTIONNAIRE_ROLES,
  QUESTIONNAIRE_TOOLS,
} from "#features/showcase/constants.ts"

function AttachmentIcon({ state }: Readonly<{ state: (typeof ATTACHMENT_STATES)[number] }>) {
  if (state === "error") {
    return <Icon.AlertCircle />
  }

  if (state === "done") {
    return <Icon.CircleCheck />
  }

  return <Icon.Plus />
}

export default function ShowcaseConversation() {
  return (
    <>
      <ShowcaseSection id="message">
        <MessageGroup className="max-w-xl">
          <Message>
            <MessageAvatar>
              <Avatar>
                <AvatarFallback>AL</AvatarFallback>
              </Avatar>
            </MessageAvatar>
            <MessageContent>
              <MessageHeader>Ada · 9:41</MessageHeader>
              <Bubble variant="secondary">
                <BubbleContent>Can you review the pull request before lunch?</BubbleContent>
              </Bubble>
            </MessageContent>
          </Message>
          <Message align="end">
            <MessageContent>
              <Bubble>
                <BubbleContent>On it. I will leave comments in a few minutes.</BubbleContent>
              </Bubble>
              <MessageFooter>Read 9:42</MessageFooter>
            </MessageContent>
          </Message>
          <Message>
            <MessageAvatar>
              <Avatar>
                <AvatarFallback>
                  <Icon.Bot className="size-4" />
                </AvatarFallback>
              </Avatar>
            </MessageAvatar>
            <MessageContent>
              <MessageHeader>Assistant</MessageHeader>
              <Bubble variant="ghost">
                <BubbleContent className="flex items-center gap-2 text-muted-foreground">
                  <Spinner />
                  Thinking...
                </BubbleContent>
              </Bubble>
            </MessageContent>
          </Message>
        </MessageGroup>
      </ShowcaseSection>

      <ShowcaseSection id="bubble">
        <ShowcaseDemo className="grid max-w-xl grid-cols-1 gap-3" label="Variants">
          {BUBBLE_VARIANTS.map((variant, index) => (
            <Bubble align={index % 2 === 0 ? "start" : "end"} key={variant} variant={variant}>
              <BubbleContent>This is the {variant} bubble.</BubbleContent>
            </Bubble>
          ))}
        </ShowcaseDemo>
        <ShowcaseDemo className="grid max-w-xl grid-cols-1 gap-6" label="Group and reactions">
          <BubbleGroup>
            <Bubble variant="secondary">
              <BubbleContent>Shipping the release now.</BubbleContent>
            </Bubble>
            <Bubble variant="secondary">
              <BubbleContent>Everything looks green.</BubbleContent>
              <BubbleReactions>🎉 2</BubbleReactions>
            </Bubble>
          </BubbleGroup>
          <Bubble align="end">
            <BubbleContent>Nice work!</BubbleContent>
            <BubbleReactions align="start" side="top">
              👍
            </BubbleReactions>
          </Bubble>
        </ShowcaseDemo>
      </ShowcaseSection>

      <ShowcaseSection id="attachment">
        <ShowcaseDemo label="States">
          {ATTACHMENT_STATES.map((state) => (
            <Attachment key={state} state={state}>
              <AttachmentMedia>
                {state === "uploading" || state === "processing" ? (
                  <Spinner />
                ) : (
                  <AttachmentIcon state={state} />
                )}
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>report-{state}.pdf</AttachmentTitle>
                <AttachmentDescription>{ATTACHMENT_DESCRIPTIONS[state]}</AttachmentDescription>
              </AttachmentContent>
              <AttachmentActions>
                <AttachmentAction aria-label={`Remove report-${state}.pdf`}>
                  <Icon.X />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          ))}
        </ShowcaseDemo>
        <ShowcaseDemo label="Sizes">
          {ATTACHMENT_SIZES.map((size) => (
            <Attachment key={size} size={size}>
              <AttachmentMedia>
                <Icon.Square />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>notes-{size}.txt</AttachmentTitle>
                <AttachmentDescription>2 KB</AttachmentDescription>
              </AttachmentContent>
            </Attachment>
          ))}
        </ShowcaseDemo>
        <ShowcaseDemo label="Vertical image attachments in a group">
          <AttachmentGroup>
            <Attachment orientation="vertical">
              <AttachmentMedia variant="image">
                <img alt="Gradient preview" src={AVATAR_IMAGE_SRC} />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>cover.svg</AttachmentTitle>
                <AttachmentDescription>1 KB</AttachmentDescription>
              </AttachmentContent>
              <AttachmentTrigger aria-label="Open cover.svg" />
            </Attachment>
            <Attachment orientation="vertical" state="uploading">
              <AttachmentMedia variant="image">
                <img alt="Uploading preview" src={AVATAR_IMAGE_SRC} />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>banner.svg</AttachmentTitle>
                <AttachmentDescription>Uploading</AttachmentDescription>
              </AttachmentContent>
              <AttachmentActions>
                <AttachmentAction aria-label="Cancel upload" variant="secondary">
                  <Icon.X />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
            <Attachment orientation="vertical">
              <AttachmentMedia>
                <Icon.Square />
              </AttachmentMedia>
            </Attachment>
          </AttachmentGroup>
        </ShowcaseDemo>
      </ShowcaseSection>

      <ShowcaseSection
        description="Scroll up to reveal the jump-to-end button."
        id="message-scroller"
      >
        <MessageScrollerProvider defaultScrollPosition="end">
          <MessageScroller className="h-80 max-w-xl rounded-lg border">
            <MessageScrollerViewport aria-label="Conversation">
              <MessageScrollerContent className="gap-4 p-4">
                {CONVERSATION.map((message) => (
                  <MessageScrollerItem key={message.id} messageId={message.id}>
                    <Message align={message.align}>
                      <MessageContent>
                        <MessageHeader>
                          {message.author} · {message.time}
                        </MessageHeader>
                        <Bubble variant={message.align === "end" ? "default" : "secondary"}>
                          <BubbleContent>{message.text}</BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                ))}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      </ShowcaseSection>

      <ShowcaseSection id="questionnaire">
        <Questionnaire
          className="max-w-xl"
          items={QUESTIONNAIRE_ITEMS}
          onSubmit={(event) => {
            event.preventDefault()
            toast.add({ title: "Thanks for your answers", type: "success" })
          }}
          shortcuts="letters"
        >
          <QuestionnaireProgress />
          <QuestionnaireItem name="role" required>
            <QuestionnaireTitle>What best describes your role?</QuestionnaireTitle>
            <QuestionnaireDescription>Pick one option to continue.</QuestionnaireDescription>
            <QuestionnaireChoices>
              {QUESTIONNAIRE_ROLES.map((role) => (
                <QuestionnaireChoice key={role.value} value={role.value}>
                  {role.label}
                  <QuestionnaireChoiceDescription>
                    {role.description}
                  </QuestionnaireChoiceDescription>
                </QuestionnaireChoice>
              ))}
            </QuestionnaireChoices>
            <QuestionnaireError>Choose a role to continue.</QuestionnaireError>
          </QuestionnaireItem>
          <QuestionnaireItem multiple name="tools">
            <QuestionnaireTitle>Which tools do you use?</QuestionnaireTitle>
            <QuestionnaireDescription>Select all that apply, or skip.</QuestionnaireDescription>
            <QuestionnaireChoices>
              {QUESTIONNAIRE_TOOLS.map((tool) => (
                <QuestionnaireChoice key={tool.value} value={tool.value}>
                  {tool.label}
                </QuestionnaireChoice>
              ))}
            </QuestionnaireChoices>
          </QuestionnaireItem>
          <QuestionnaireItem name="feedback">
            <QuestionnaireTitle>Anything else we should know?</QuestionnaireTitle>
            <QuestionnaireInput aria-label="Feedback" placeholder="Type your answer..." />
          </QuestionnaireItem>
          <QuestionnaireActions>
            <QuestionnairePrevious />
            <QuestionnaireSkip />
            <QuestionnaireNext />
            <QuestionnaireSubmit />
          </QuestionnaireActions>
        </Questionnaire>
      </ShowcaseSection>
    </>
  )
}
