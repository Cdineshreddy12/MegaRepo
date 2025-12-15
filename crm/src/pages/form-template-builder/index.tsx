import Page, { PageHeader } from "@/components/Page"
import FormBuilder from "@/components/template-builder/form-builder"

function FormTemplateBuilder() {
  return (
   <Page header={<PageHeader title="Form Template Builder" description="Create and manage your form templates" />}>
    <FormBuilder />
   </Page>
  )
}

export default FormTemplateBuilder