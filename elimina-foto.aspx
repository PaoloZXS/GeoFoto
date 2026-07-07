<%@ Page Language="C#" %>
<%@ Import Namespace="System.IO" %>
<script runat="server">
    protected void Page_Load(object sender, EventArgs e)
    {
        if (Request.HttpMethod != "POST")
        {
            Response.StatusCode = 405;
            Response.Write("POST required");
            return;
        }

        try
        {
            string cliente = Request.Form["cliente"] ?? "";
            string foto = Request.Form["foto"] ?? "";

            foreach (char c in Path.GetInvalidFileNameChars())
            {
                cliente = cliente.Replace(c.ToString(), "");
                foto = foto.Replace(c.ToString(), "");
            }

            if (string.IsNullOrEmpty(cliente) || string.IsNullOrEmpty(foto))
            {
                Response.StatusCode = 400;
                Response.Write("Parametri mancanti");
                return;
            }

            string path = Path.Combine(@"C:\FotoCampiSolari", cliente, foto);
            if (!File.Exists(path))
            {
                Response.StatusCode = 404;
                Response.Write("File non trovato");
                return;
            }

            File.Delete(path);
            Response.Write("OK");
        }
        catch (Exception ex)
        {
            Response.StatusCode = 500;
            Response.Write(ex.Message);
        }
    }
</script>
