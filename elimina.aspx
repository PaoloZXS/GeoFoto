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
            foreach (char c in Path.GetInvalidFileNameChars())
                cliente = cliente.Replace(c.ToString(), "");

            if (string.IsNullOrEmpty(cliente))
            {
                Response.StatusCode = 400;
                Response.Write("Cliente non valido");
                return;
            }

            string dir = @"C:\FotoCampiSolari\" + cliente;
            if (!Directory.Exists(dir))
            {
                Response.StatusCode = 404;
                Response.Write("Cartella non trovata");
                return;
            }

            Directory.Delete(dir, true);
            Response.Write("OK");
        }
        catch (Exception ex)
        {
            Response.StatusCode = 500;
            Response.Write(ex.Message);
        }
    }
</script>
