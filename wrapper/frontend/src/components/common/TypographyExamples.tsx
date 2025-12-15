import { Typography } from "./Typography"

export function TypographyExamples() {
  return (
    <div className="space-y-8 p-6">
      <div>
        <Typography variant="h1" className="mb-4">Typography Component Examples</Typography>
        <Typography variant="lead" className="mb-6">
          A comprehensive typography system with standard component library patterns.
        </Typography>
      </div>

      {/* Headings */}
      <section className="space-y-4">
        <Typography variant="h2">Headings</Typography>
        <div className="space-y-2">
          <Typography variant="h1">Heading 1 - Main Page Title</Typography>
          <Typography variant="h2">Heading 2 - Section Title</Typography>
          <Typography variant="h3">Heading 3 - Subsection Title</Typography>
          <Typography variant="h4">Heading 4 - Component Title</Typography>
          <Typography variant="h5">Heading 5 - Small Title</Typography>
          <Typography variant="h6">Heading 6 - Smallest Title</Typography>
        </div>
      </section>

      {/* Display Text */}
      <section className="space-y-4">
        <Typography variant="h2">Display Text</Typography>
        <div className="space-y-2">
          <Typography variant="displayLarge">Display Large</Typography>
          <Typography variant="display">Display</Typography>
          <Typography variant="displaySmall">Display Small</Typography>
        </div>
      </section>

      {/* Body Text */}
      <section className="space-y-4">
        <Typography variant="h2">Body Text</Typography>
        <div className="space-y-2">
          <Typography variant="bodyLarge">
            This is large body text. It's perfect for important content that needs to stand out while still being readable.
          </Typography>
          <Typography variant="body">
            This is regular body text. It's the standard size for most content and provides good readability for longer passages.
          </Typography>
          <Typography variant="bodySmall">
            This is small body text. It's useful for secondary information, captions, or when space is limited.
          </Typography>
        </div>
      </section>

      {/* Paragraphs */}
      <section className="space-y-4">
        <Typography variant="h2">Paragraphs</Typography>
        <div className="space-y-4">
          <Typography variant="pLarge">
            This is a large paragraph. It has more spacing and is perfect for introductory content or important sections that need emphasis.
          </Typography>
          <Typography variant="p">
            This is a regular paragraph. It follows standard paragraph spacing and is ideal for most content blocks. It provides good readability and follows typography best practices.
          </Typography>
          <Typography variant="pSmall">
            This is a small paragraph. It's useful for secondary content, notes, or when you need to fit more text in a smaller space.
          </Typography>
        </div>
      </section>

      {/* Special Text */}
      <section className="space-y-4">
        <Typography variant="h2">Special Text</Typography>
        <div className="space-y-2">
          <Typography variant="lead">
            This is lead text. It's perfect for introductory paragraphs or content that needs to stand out as a summary or introduction.
          </Typography>
          <Typography variant="large">Large text for emphasis</Typography>
          <Typography variant="small">Small text for details</Typography>
          <Typography variant="muted">Muted text for secondary information</Typography>
        </div>
      </section>

      {/* Code */}
      <section className="space-y-4">
        <Typography variant="h2">Code</Typography>
        <div className="space-y-2">
          <Typography variant="code">
            const example = "This is a code block";
            console.log(example);
          </Typography>
          <Typography variant="body">
            Here's some <Typography variant="inlineCode">inline code</Typography> within a sentence.
          </Typography>
        </div>
      </section>

      {/* Labels */}
      <section className="space-y-4">
        <Typography variant="h2">Labels</Typography>
        <div className="space-y-2">
          <Typography variant="labelLarge">Large Label</Typography>
          <Typography variant="label">Regular Label</Typography>
          <Typography variant="labelSmall">Small Label</Typography>
        </div>
      </section>

      {/* Captions and Overlines */}
      <section className="space-y-4">
        <Typography variant="h2">Captions and Overlines</Typography>
        <div className="space-y-2">
          <Typography variant="overline">OVERLINE TEXT</Typography>
          <Typography variant="caption">This is caption text</Typography>
        </div>
      </section>

      {/* Weight Variants */}
      <section className="space-y-4">
        <Typography variant="h2">Font Weights</Typography>
        <div className="space-y-2">
          <Typography variant="thin">Thin weight text</Typography>
          <Typography variant="light">Light weight text</Typography>
          <Typography variant="normal">Normal weight text</Typography>
          <Typography variant="medium">Medium weight text</Typography>
          <Typography variant="semibold">Semibold weight text</Typography>
          <Typography variant="bold">Bold weight text</Typography>
        </div>
      </section>

      {/* Color Variants */}
      <section className="space-y-4">
        <Typography variant="h2">Color Variants</Typography>
        <div className="space-y-2">
          <Typography variant="primary">Primary color text</Typography>
          <Typography variant="secondary">Secondary color text</Typography>
          <Typography variant="muted">Muted color text</Typography>
          <Typography variant="destructive">Destructive color text</Typography>
          <Typography variant="success">Success color text</Typography>
          <Typography variant="warning">Warning color text</Typography>
          <Typography variant="info">Info color text</Typography>
        </div>
      </section>

      {/* Blockquote */}
      <section className="space-y-4">
        <Typography variant="h2">Blockquote</Typography>
        <Typography variant="blockquote">
          "This is a blockquote. It's perfect for highlighting important quotes, testimonials, or key insights from your content."
        </Typography>
      </section>

      {/* List */}
      <section className="space-y-4">
        <Typography variant="h2">List</Typography>
        <Typography variant="list">
          <li>First list item</li>
          <li>Second list item</li>
          <li>Third list item</li>
        </Typography>
      </section>

      {/* Custom Elements */}
      <section className="space-y-4">
        <Typography variant="h2">Custom Elements</Typography>
        <div className="space-y-2">
          <Typography variant="h1" as="div">H1 as div</Typography>
          <Typography variant="body" as="span">Body as span</Typography>
          <Typography variant="large" as="h2">Large as h2</Typography>
        </div>
      </section>

      {/* Real-world Examples */}
      <section className="space-y-4">
        <Typography variant="h2">Real-world Examples</Typography>
        <div className="space-y-4 p-4 border rounded-lg">
          <Typography variant="h3">Card Title</Typography>
          <Typography variant="lead">This is a card description that explains what this component does.</Typography>
          <Typography variant="body">
            Here's some detailed information about the card. This content provides more context and details for the user.
          </Typography>
          <div className="flex items-center gap-2">
            <Typography variant="label">Status:</Typography>
            <Typography variant="success">Active</Typography>
          </div>
          <Typography variant="caption">Last updated 2 hours ago</Typography>
        </div>
      </section>
    </div>
  )
}

export default TypographyExamples
